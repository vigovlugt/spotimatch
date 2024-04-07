package main

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"

	"log"
	"os"

	gonanoid "github.com/matoous/go-nanoid/v2"
	"nhooyr.io/websocket"
)

type Player struct {
	Id   string
	Conn *websocket.Conn
	Data []byte
}

type IncomingMessage struct {
	Player *Player
	Data   []byte
}

type Lobby struct {
	Id      string
	Owner   *Player
	Players map[string](*Player)

	incoming   chan IncomingMessage
	register   chan *Player
	unregister chan *Player
}

type PlayerJoined struct {
	Typ string `json:"type"`
	Id  string `json:"id"`
}

func NewPlayerJoined(id string) *PlayerJoined {
	return &PlayerJoined{
		Typ: "playerJoined",
		Id:  id,
	}
}

type RegisterPlayerInfo struct {
	Typ  string      `json:"type"`
	Data interface{} `json:"data"`
}

type PlayerInfo struct {
	Typ  string      `json:"type"`
	Id   string      `json:"id"`
	Data interface{} `json:"data"`
}

type LobbyInfo struct {
	Typ     string `json:"type"`
	LobbyId string `json:"id"`
}

func NewLobbyInfo(id string) *LobbyInfo {
	return &LobbyInfo{
		Typ:     "lobbyInfo",
		LobbyId: id,
	}
}

func NewPlayerInfo(id string, data interface{}) *PlayerInfo {
	return &PlayerInfo{
		Typ:  "playerInfo",
		Id:   id,
		Data: data,
	}
}

type AppContext struct {
	Lobbies *LobbyMap
}

type LobbyMap struct {
	Lock sync.Mutex
	Map  map[string]*Lobby
}

func (m *LobbyMap) CreateLobby(owner *websocket.Conn) (*Lobby, error) {
	m.Lock.Lock()
	defer m.Lock.Unlock()
	var id string
	var err error
	for {
		id, err = gonanoid.Generate("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6)
		if err != nil {
			return nil, err
		}

		if _, ok := m.Map[id]; !ok {
			break
		}
	}

	lobby := &Lobby{
		Id:         id,
		Owner:      &Player{Conn: owner},
		Players:    make(map[string](*Player)),
		incoming:   make(chan IncomingMessage),
		register:   make(chan *Player),
		unregister: make(chan *Player),
	}

	m.Map[id] = lobby

	go lobby.Run(context.Background())

	lobbyInfo := NewLobbyInfo(id)
	lobbyInfoData, err := json.Marshal(lobbyInfo)
	if err != nil {
		log.Printf("Failed to marshal lobby info: %v", err)
		return nil, err
	}

	owner.Write(context.Background(), websocket.MessageText, lobbyInfoData)
	// Close lobby on owner disconnect
	go func() {
		_, _, err := owner.Read(context.Background())
		if err != nil {
			lobby.Owner.Conn.Close(websocket.StatusNormalClosure, "Owner disconnected")
			m.DeleteLobby(id)
		}
	}()

	log.Printf("Created lobby %v", id)

	return lobby, nil
}

type JoinLobbyError string

func (e JoinLobbyError) Error() string {
	return string(e)
}

const (
	LobbyNotFoundError = JoinLobbyError("Lobby not found")
)

func (m *LobbyMap) JoinLobby(id string, playerConn *websocket.Conn, playerId string) (*Lobby, error) {
	m.Lock.Lock()
	defer m.Lock.Unlock()
	lobby, ok := m.Map[id]
	if !ok {
		return nil, LobbyNotFoundError
	}

	if playerId == "" {
		var err error
		playerId, err = gonanoid.New()
		if err != nil {
			log.Printf("Failed to generate player id: %v", err)
			return nil, err
		}
	}

	player := &Player{Conn: playerConn, Id: playerId}

	lobby.register <- player

	log.Printf("Player %v joined lobby %v", playerId, id)

	return lobby, nil
}

func (m *LobbyMap) GetLobby(id string) (*Lobby, bool) {
	m.Lock.Lock()
	defer m.Lock.Unlock()
	lobby, ok := m.Map[id]
	return lobby, ok
}

func (m *LobbyMap) DeleteLobby(id string) {
	m.Lock.Lock()
	defer m.Lock.Unlock()

	lobby, ok := m.Map[id]
	if !ok {
		return
	}

	for _, player := range lobby.Players {
		player.Conn.Close(websocket.StatusNormalClosure, "Lobby closed")
	}

	delete(m.Map, id)

	log.Printf("Closed lobby %v", id)
}

func (l *Lobby) Run(ctx context.Context) {
	for {
		select {
		case player := <-l.register:
			go func() {
				for {
					_, data, err := player.Conn.Read(ctx)
					if err != nil {
						log.Println(err)
						l.unregister <- player
						return
					}

					l.incoming <- IncomingMessage{Player: player, Data: data}
				}
			}()

			// Replace player if already exists
			p, playerExists := l.Players[player.Id]
			if playerExists {
				p.Conn.Close(websocket.StatusNormalClosure, "Connection replaced")
				l.Players[player.Id] = player
				continue
			}

			l.Players[player.Id] = player

			playerJoinMessage := NewPlayerJoined(player.Id)

			jsonData, err := json.Marshal(playerJoinMessage)
			if err != nil {
				log.Printf("Failed to marshal player join message: %v", err)
				return
			}

			player.Conn.Write(ctx, websocket.MessageText, jsonData)
			l.Owner.Conn.Write(ctx, websocket.MessageText, jsonData)

		case message := <-l.incoming:
			var registerPlayerInfo RegisterPlayerInfo
			err := json.Unmarshal(message.Data, &registerPlayerInfo)
			if err != nil {
				log.Printf("Failed to unmarshal incoming message: %v", err)
				continue
			}
			if registerPlayerInfo.Typ != "registerPlayerInfo" {
				log.Printf("Invalid message type: %v", registerPlayerInfo.Typ)
				continue
			}

			playerInfo := NewPlayerInfo(message.Player.Id, registerPlayerInfo.Data)
			playerInfoData, err := json.Marshal(playerInfo)
			if err != nil {
				log.Printf("Failed to marshal player info: %v", err)
				continue
			}

			l.Owner.Conn.Write(ctx, websocket.MessageText, playerInfoData)
		}
	}
}

func main() {
	err := run()
	if err != nil {
		log.Fatal(err)
	}
}

func run() error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	appContext := &AppContext{
		Lobbies: &LobbyMap{
			Map: make(map[string]*Lobby),
		},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleWs(appContext))

	log.Println("Listening on http://localhost:" + port)
	http.ListenAndServe("0.0.0.0:"+port, mux)

	return nil
}

func handleWs(ctx *AppContext) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lobbyId := r.URL.Query().Get("lobby")
		if lobbyId != "" {
			_, ok := ctx.Lobbies.GetLobby(lobbyId)
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				w.Write([]byte("Lobby not found"))
				return
			}
		}

		c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
			OriginPatterns: []string{"localhost:5173", "127.0.0.1:5173"},
		})
		if err != nil {
			log.Println(err)
			return
		}
		c.SetReadLimit(1024 * 1024 * 1024)

		if lobbyId == "" {
			_, err := ctx.Lobbies.CreateLobby(c)
			if err != nil {
				log.Println(err)
				return
			}
		} else {
			playerId := r.URL.Query().Get("player")

			_, err := ctx.Lobbies.JoinLobby(lobbyId, c, playerId)
			if err == LobbyNotFoundError {
				c.Close(3000, "Lobby not found")
				return
			}
			if err != nil {
				log.Println(err)
				return
			}
		}
	})
}

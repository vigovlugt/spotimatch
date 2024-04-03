package main

import (
	"context"
	"net/http"

	"log"
	"os"

	gonanoid "github.com/matoous/go-nanoid/v2"
	"nhooyr.io/websocket"
)

type Player struct {
	Conn           *websocket.Conn
	Name           string
	ProfilePicture string
}

type Lobby struct {
	Id      string
	Owner   *websocket.Conn
	Players map[*websocket.Conn]struct{}
}

type AppContext struct {
	Lobbies LobbyMap
}

type LobbyMap map[string]*Lobby

func (m *LobbyMap) CreateLobby(owner *websocket.Conn) (*Lobby, error) {
	id, err := gonanoid.Generate("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6)
	if err != nil {
		return nil, err
	}

	lobby := &Lobby{
		Id:      id,
		Owner:   owner,
		Players: make(map[*websocket.Conn]struct{}),
	}

	(*m)[id] = lobby

	return lobby, nil
}

func (m *LobbyMap) DeleteLobby(id string) {
	delete(*m, id)
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
		Lobbies: make(LobbyMap),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleWs(appContext))

	log.Println("Listening on http://localhost:" + port)
	http.ListenAndServe("0.0.0.0:"+port, mux)

	return nil
}

func handleWs(ctx *AppContext) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := websocket.Accept(w, r, &websocket.AcceptOptions{})
		if err != nil {
			log.Println(err)
			return
		}

		handleWebsocket(r.Context(), ctx, c)
	})
}

func handleWebsocket(ctx context.Context, app *AppContext, c *websocket.Conn) {
	for {
		_, data, err := c.Read(ctx)
		if err != nil {
			log.Println(err)
			return
		}

		err = c.Write(ctx, websocket.MessageText, data)
		if err != nil {
			log.Println(err)
			return
		}
	}
}

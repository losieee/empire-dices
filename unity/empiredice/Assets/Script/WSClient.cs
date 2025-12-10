using System;
using UnityEngine;
using NativeWebSocket;
using Newtonsoft.Json;

public class WSClient : MonoBehaviour
{
    private static WSClient instance;
    public static WSClient Instance => instance;

    private WebSocket ws;
    [SerializeField] private string serverUrl = "ws://127.0.0.1:3000";

    public bool IsConnected => ws != null && ws.State == WebSocketState.Open;
    public string UserId { get; private set; }
    public string SessionId { get; set; }

    void Awake()
    {
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else Destroy(gameObject);
    }

    void Update()
    {
#if !UNITY_WEBGL || UNITY_EDITOR
        ws?.DispatchMessageQueue();
#endif
    }

    public async void Connect()
    {
        if (IsConnected) return;

        ws = new WebSocket(serverUrl);

        ws.OnOpen += () => { Debug.Log("서버 연결 성공"); };
        ws.OnError += (e) => { Debug.LogError("WS Error: " + e); };
        ws.OnClose += (e) => { Debug.Log("서버 연결 종료"); };

        ws.OnMessage += (bytes) =>
        {
            string msg = System.Text.Encoding.UTF8.GetString(bytes);
            HandleMessage(msg);
        };

        await ws.Connect();
    }

    private void HandleMessage(string json)
    {
        ServerMessage msg = JsonConvert.DeserializeObject<ServerMessage>(json);

        switch (msg.type)
        {
            case "auth_ok":
                UserId = msg.userId;
                break;

            case "roomCreated":
                SessionId = msg.sessionId;
                LobbyUI.Instance.OpenWaitingRoom(msg.sessionId);
                break;

            case "joinedRoom":
                SessionId = msg.sessionId;
                LobbyUI.Instance.OpenWaitingRoom(msg.sessionId);
                break;
        }
    }

    public async void SendAuth(string token)
    {
        var msg = new { type = "auth", token };
        await ws.SendText(JsonConvert.SerializeObject(msg));
    }

    public async void CreateRoom()
    {
        var msg = new { type = "createRoom" };
        await ws.SendText(JsonConvert.SerializeObject(msg));
    }

    public async void JoinRoom(int id)
    {
        var msg = new { type = "joinRoom", sessionId = id };
        await ws.SendText(JsonConvert.SerializeObject(msg));
    }
}

[Serializable]
public class ServerMessage
{
    public string type;
    public string userId;
    public string sessionId;
}

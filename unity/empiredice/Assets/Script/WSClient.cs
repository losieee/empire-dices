using System;
using UnityEngine;
using NativeWebSocket;
using Newtonsoft.Json;

public class WSClient : MonoBehaviour
{
    public static WSClient Instance;

    private WebSocket ws;
    [SerializeField] private string serverUrl = "ws://127.0.0.1:3000";

    public bool IsConnected => ws != null && ws.State == WebSocketState.Open;

    public string SessionId { get; private set; }
    public string UserId { get; private set; }

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
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

        ws.OnOpen += () =>
        {
            Debug.Log("서버 연결 성공!");
        };

        ws.OnError += (e) =>
        {
            Debug.LogError("WebSocket Error: " + e);
        };

        ws.OnClose += (e) =>
        {
            Debug.Log("서버 연결 종료");
        };

        ws.OnMessage += (bytes) =>
        {
            string msg = System.Text.Encoding.UTF8.GetString(bytes);
            HandleMessage(msg);
        };

        await ws.Connect();
    }

    private void HandleMessage(string json)
    {
        Debug.Log("[서버 메세지] " + json);

        var msg = JsonConvert.DeserializeObject<ServerMessage>(json);

        if (msg == null) return;

        switch (msg.type)
        {
            case "auth_ok":
                UserId = msg.userId;
                Debug.Log("인증 성공: " + UserId);
                break;

            case "roomCreated":
                SessionId = msg.sessionId;
                Debug.Log("방 생성 성공! ID = " + SessionId);
                LobbyUI.Instance.OpenWaitingRoom(SessionId); // ← 여기로 변경
                break;


            case "roomDeleted":
                Debug.Log("방 삭제 완료");
                break;

            default:
                Debug.Log("알 수 없는 메시지: " + msg.type);
                break;
        }
    }

    public async void SendAuth(string token)
    {
        if (!IsConnected) return;

        var msg = new { type = "auth", token };
        await ws.SendText(JsonConvert.SerializeObject(msg));
    }

    public async void CreateRoom()
    {
        if (!IsConnected) return;

        var msg = new { type = "createRoom" };
        await ws.SendText(JsonConvert.SerializeObject(msg));
    }
    public async void JoinRoom(int sessionId)
    {
        if (!IsConnected) return;

        var msg = new
        {
            type = "joinRoom",
            sessionId = sessionId
        };

        await ws.SendText(JsonConvert.SerializeObject(msg));
    }




    public async void DeleteRoom()
    {
        Debug.Log("DeleteRoom() 호출됨. SessionId = " + SessionId);

        if (!IsConnected)
        {
            Debug.Log("DeleteRoom 실패: WS 연결 안됨");
            return;
        }

        if (string.IsNullOrEmpty(SessionId))
        {
            Debug.Log("DeleteRoom 실패: SessionId 없음!");
            return;
        }

        var msg = new { type = "deleteRoom", sessionId = SessionId };
        await ws.SendText(JsonConvert.SerializeObject(msg));

        SessionId = null;
    }
    public void ResetSession()
    {
        SessionId = null;
    }

}

[Serializable]
public class ServerMessage
{
    public string type;
    public string sessionId;
    public string userId;
    public int playerCount;
}

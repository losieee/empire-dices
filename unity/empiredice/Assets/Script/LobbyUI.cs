using UnityEngine;
using TMPro;
using UnityEngine.Networking;
using System.Collections;

public class LobbyUI : MonoBehaviour
{
    public static LobbyUI Instance;

    public GameObject lobbyPanel;
    public GameObject registerPanel;
    public GameObject roomListPanel;
    public GameObject waitingRoomPanel;

    public TMP_InputField regUsernameInput;
    public TMP_InputField regPasswordInput;

    public TMP_InputField loginUsernameInput;
    public TMP_InputField loginPasswordInput;

    public Transform roomListContent;
    public GameObject roomItemPrefab;
    public TMP_Text waitingInfoText;

    GameObject templateItem;

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    void Start()
    {
        lobbyPanel.SetActive(true);
        registerPanel.SetActive(false);
        roomListPanel.SetActive(false);
        waitingRoomPanel.SetActive(false);
        UnityMainThreadDispatcher.Initialize();

        if (roomItemPrefab != null && roomItemPrefab.scene.IsValid())
        {
            templateItem = roomItemPrefab;
            templateItem.SetActive(false);
        }
        else
        {
            templateItem = null;
        }
    }

    public void OpenRegister()
    {
        lobbyPanel.SetActive(false);
        registerPanel.SetActive(true);
    }

    public void BackToLobby()
    {
        registerPanel.SetActive(false);
        roomListPanel.SetActive(false);
        waitingRoomPanel.SetActive(false);
        lobbyPanel.SetActive(true);
    }

    public void BackToRoomList()
    {
        registerPanel.SetActive(false);
        lobbyPanel.SetActive(false);
        waitingRoomPanel.SetActive(false);
        roomListPanel.SetActive(true);
        StartCoroutine(LoadRoomList());
    }

    public void RegisterUser()
    {
        StartCoroutine(RegisterRequest(regUsernameInput.text, regPasswordInput.text));
    }

    IEnumerator RegisterRequest(string user, string pass)
    {
        var json = JsonUtility.ToJson(new RegisterData(user, pass));
        byte[] body = System.Text.Encoding.UTF8.GetBytes(json);

        UnityWebRequest www = new UnityWebRequest("http://localhost:3000/auth/register", "POST");
        www.uploadHandler = new UploadHandlerRaw(body);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
            BackToLobby();
    }

    public void LoginUser()
    {
        StartCoroutine(LoginRequest(loginUsernameInput.text, loginPasswordInput.text));
    }

    IEnumerator LoginRequest(string user, string pass)
    {
        var json = JsonUtility.ToJson(new RegisterData(user, pass));
        byte[] body = System.Text.Encoding.UTF8.GetBytes(json);

        UnityWebRequest www = new UnityWebRequest("http://localhost:3000/auth/login", "POST");
        www.uploadHandler = new UploadHandlerRaw(body);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");

        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            LoginResponse res = JsonUtility.FromJson<LoginResponse>(www.downloadHandler.text);
            PlayerPrefs.SetString("jwt_token", res.token);

            WSClient.Instance.Connect();
            StartCoroutine(WaitAuth(res.token));

            ShowRoomList();
        }
    }

    IEnumerator WaitAuth(string token)
    {
        yield return new WaitUntil(() => WSClient.Instance.IsConnected);
        WSClient.Instance.SendAuth(token);
    }

    public void ShowRoomList()
    {
        lobbyPanel.SetActive(false);
        registerPanel.SetActive(false);
        waitingRoomPanel.SetActive(false);
        roomListPanel.SetActive(true);

        StartCoroutine(LoadRoomList());
    }

    IEnumerator LoadRoomList()
    {
        UnityWebRequest www = UnityWebRequest.Get("http://localhost:3000/rooms");
        yield return www.SendWebRequest();

        if (www.result != UnityWebRequest.Result.Success)
            yield break;

        string json = "{\"rooms\":" + www.downloadHandler.text + "}";
        RoomListResponse res = JsonUtility.FromJson<RoomListResponse>(json);

        for (int i = roomListContent.childCount - 1; i >= 0; i--)
        {
            var child = roomListContent.GetChild(i).gameObject;
            if (templateItem != null && child == templateItem) continue;
            Destroy(child);
        }

        if (res.rooms == null || res.rooms.Length == 0)
            yield break;

        for (int i = 0; i < res.rooms.Length; i++)
        {
            GameObject item;

            if (templateItem != null)
            {
                item = Instantiate(templateItem, roomListContent);
                item.SetActive(true);
            }
            else
            {
                item = Instantiate(roomItemPrefab, roomListContent);
            }

            var ui = item.GetComponent<RoomItemUI>();
            if (ui != null)
                ui.Setup(res.rooms[i].session_id, res.rooms[i].player_count);
        }
    }

    public void CreateRoom()
    {
        WSClient.Instance.CreateRoom();
    }

    public void OpenWaitingRoom(string sessionId)
    {
        lobbyPanel.SetActive(false);
        registerPanel.SetActive(false);
        roomListPanel.SetActive(false);
        waitingRoomPanel.SetActive(true);

        if (waitingInfoText != null)
            waitingInfoText.text = $"방 번호: {sessionId}\n1/2 플레이어 대기중...";
    }

    public void HideWaitingRoom()
    {
        waitingRoomPanel.SetActive(false);
    }
}

[System.Serializable]
public class RegisterData
{
    public string username;
    public string password;
    public RegisterData(string u, string p)
    {
        username = u;
        password = p;
    }
}

[System.Serializable]
public class LoginResponse
{
    public string token;
}

[System.Serializable]
public class RoomInfo
{
    public int session_id;
    public int player_count;
}

[System.Serializable]
public class RoomListResponse
{
    public RoomInfo[] rooms;
}

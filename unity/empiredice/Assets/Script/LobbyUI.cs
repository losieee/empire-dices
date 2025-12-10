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

    void Awake() => Instance = this;

    void Start()
    {
        lobbyPanel.SetActive(true);
        registerPanel.SetActive(false);
        roomListPanel.SetActive(false);
        waitingRoomPanel.SetActive(false);
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

    public void RegisterUser()
    {
        StartCoroutine(RegisterRequest(
            regUsernameInput.text,
            regPasswordInput.text
        ));
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
        StartCoroutine(LoginRequest(
            loginUsernameInput.text,
            loginPasswordInput.text
        ));
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

    void ShowRoomList()
    {
        lobbyPanel.SetActive(false);
        registerPanel.SetActive(false);
        roomListPanel.SetActive(true);
        waitingRoomPanel.SetActive(false);
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

        waitingInfoText.text = $"방 번호: {sessionId}\n1/2 플레이어 대기중...";
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

using UnityEngine;
using TMPro;
using UnityEngine.Networking;
using System.Collections;

public class LobbyUI : MonoBehaviour
{
    [Header("Panels")]
    public GameObject lobbyPanel;
    public GameObject registerPanel;

    [Header("Login Inputs")]
    public TMP_InputField loginUsernameInput;
    public TMP_InputField loginPasswordInput;

    [Header("Register Inputs")]
    public TMP_InputField regUsernameInput;
    public TMP_InputField regPasswordInput;

    void Start()
    {
        lobbyPanel.SetActive(true);
        registerPanel.SetActive(false);
    }

    // 회원가입 패널 열기
    public void OpenRegister()
    {
        lobbyPanel.SetActive(false);
        registerPanel.SetActive(true);
    }

    // 로비로 돌아가기
    public void BackToLobby()
    {
        registerPanel.SetActive(false);
        lobbyPanel.SetActive(true);
    }

    // 회원가입 요청
    public void RegisterUser()
    {
        string username = regUsernameInput.text;
        string password = regPasswordInput.text;

        Debug.Log($"회원가입 요청 → {username} / {password}");
        StartCoroutine(RegisterRequest(username, password));
    }

    private IEnumerator RegisterRequest(string user, string pass)
    {
        var json = JsonUtility.ToJson(new RegisterData(user, pass));
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);

        UnityWebRequest www = new UnityWebRequest("http://localhost:3000/auth/register", "POST");
        www.uploadHandler = new UploadHandlerRaw(bodyRaw);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");

        Debug.Log("Sending register request...");

        yield return www.SendWebRequest();

        if (www.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError("회원가입 실패: " + www.error + "\nResponse: " + www.downloadHandler.text);
        }
        else
        {
            Debug.Log("회원가입 성공!");
            BackToLobby();
        }
    }

    // -------------------------
    // 로그인 요청
    // -------------------------
    public void LoginUser()
    {
        string username = loginUsernameInput.text;
        string password = loginPasswordInput.text;

        Debug.Log($"로그인 요청 → {username} / {password}");

        StartCoroutine(LoginRequest(username, password));
    }

    private IEnumerator LoginRequest(string user, string pass)
    {
        var json = JsonUtility.ToJson(new RegisterData(user, pass));
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);

        UnityWebRequest www = new UnityWebRequest("http://localhost:3000/auth/login", "POST");
        www.uploadHandler = new UploadHandlerRaw(bodyRaw);
        www.downloadHandler = new DownloadHandlerBuffer();
        www.SetRequestHeader("Content-Type", "application/json");

        Debug.Log("Sending login request...");

        yield return www.SendWebRequest();

        if (www.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError("로그인 실패: " + www.error + "\nResponse: " + www.downloadHandler.text);
        }
        else
        {
            Debug.Log("로그인 성공!");
            Debug.Log("Response: " + www.downloadHandler.text);

            // JSON -> 토큰 파싱
            LoginResponse response = JsonUtility.FromJson<LoginResponse>(www.downloadHandler.text);

            // 🔥 PlayerPrefs에 토큰 저장
            PlayerPrefs.SetString("token", response.token);
            PlayerPrefs.Save();
            Debug.Log("토큰 저장 완료: " + response.token);

            // 🔥 WebSocket 연결 시작
            WSClient.Instance.Connect();

            // 잠시 연결을 기다리고 인증 요청 보내기
            StartCoroutine(SendAuthAfterDelay(response.token));
        }
    }

    // WebSocket 연결 후 토큰 전달
    private IEnumerator SendAuthAfterDelay(string token)
    {
        yield return new WaitForSeconds(0.5f); // WebSocket이 열릴 시간 확보
        WSClient.Instance.SendAuth(token);
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
public class LoginData
{
    public string username;
    public string password;

    public LoginData(string u, string p)
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

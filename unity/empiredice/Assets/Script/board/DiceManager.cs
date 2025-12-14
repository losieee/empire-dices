using TMPro;
using UnityEngine;
using System.Collections;
using UnityEngine.SceneManagement;

public class DiceManager : MonoBehaviour
{
    public static DiceManager Instance;

    public TextMeshProUGUI diceText;
    public TileManager tileManager;
    public PlayerController[] players;
    public TilePurchaseUI purchaseUI;

    public GameObject rollDiceButton;
    public TextMeshProUGUI weaponText;
    public TextMeshProUGUI p1HpText;
    public TextMeshProUGUI p2HpText;

    public TextMeshProUGUI battleResultText;
    Coroutine battleTextCo;

    public GameObject gameOverPanel;
    public TextMeshProUGUI gameOverTitleText;

    int currentTurnPlayerId = -1;
    int myWeaponCount = 0;
    bool isGameOver = false;

    void Awake()
    {
        Instance = this;

        if (rollDiceButton != null)
            rollDiceButton.SetActive(false);

        if (battleResultText != null)
            battleResultText.gameObject.SetActive(false);

        if (gameOverPanel != null)
            gameOverPanel.SetActive(false);

        if (WSClient.Instance != null && WSClient.Instance.PendingGameOverWinnerId != -1)
        {
            OnGameOver(WSClient.Instance.PendingGameOverWinnerId);
            WSClient.Instance.PendingGameOverWinnerId = -1;
            return;
        }

        ApplyBufferedTurnIfExists();
    }

    void Start()
    {
        var ui = FindObjectOfType<LobbyUI>();
        if (ui != null) ui.gameObject.SetActive(false);

        if (players != null && players.Length >= 2)
        {
            players[0].playerId = 1;
            players[1].playerId = 2;
        }

        StartCoroutine(SendReadyWhenConnected());

        ApplyBufferedTurnIfExists();
    }

    void ApplyBufferedTurnIfExists()
    {
        if (isGameOver) return;

        int buffered = -1;

        if (WSClient.Instance != null && WSClient.Instance.PendingTurnPlayerId != -1)
            buffered = WSClient.Instance.PendingTurnPlayerId;
        else if (GameInfo.CurrentTurnPlayerId != -1)
            buffered = GameInfo.CurrentTurnPlayerId;

        if (buffered != -1)
        {
            OnTurnStart(buffered);

            if (WSClient.Instance != null)
                WSClient.Instance.PendingTurnPlayerId = -1;
        }
    }

    IEnumerator SendReadyWhenConnected()
    {
        yield return new WaitUntil(() =>
            WSClient.Instance != null &&
            WSClient.Instance.IsConnected &&
            !string.IsNullOrEmpty(WSClient.Instance.SessionId)
        );

        if (!WSClient.Instance.gameReadySent)
        {
            WSClient.Instance.gameReadySent = true;
            WSClient.Instance.SendGameReady();
        }
    }

    public void OnTurnStart(int playerId)
    {
        if (isGameOver) return;

        currentTurnPlayerId = playerId;
        GameInfo.CurrentTurnPlayerId = playerId;
        UpdateButtonState();
    }

    void UpdateButtonState()
    {
        if (rollDiceButton == null) return;

        if (isGameOver)
        {
            rollDiceButton.SetActive(false);
            return;
        }

        bool active = (GameInfo.MyPlayerId == currentTurnPlayerId);
        rollDiceButton.SetActive(active);
    }

    public void OnHpUpdate(int playerId, int hp)
    {
        if (playerId == 1 && p1HpText != null) p1HpText.text = hp.ToString();
        if (playerId == 2 && p2HpText != null) p2HpText.text = hp.ToString();
    }

    public void OnDiceResult(int playerId, int dice)
    {
        if (isGameOver) return;

        if (diceText != null) diceText.text = dice.ToString();
        if (rollDiceButton != null) rollDiceButton.SetActive(false);

        PlayerController player = GetPlayer(playerId);
        if (player == null) return;

        player.Move(dice, tileManager.tiles);
    }

    PlayerController GetPlayer(int id)
    {
        foreach (var p in players)
            if (p != null && p.playerId == id)
                return p;
        return null;
    }

    public void RollDice()
    {
        if (isGameOver) return;
        if (GameInfo.MyPlayerId != currentTurnPlayerId) return;

        if (rollDiceButton != null)
            rollDiceButton.SetActive(false);

        WSClient.Instance.SendRollDice();
    }

    public void OnWeaponUpdate(int playerId, int count)
    {
        if (playerId != GameInfo.MyPlayerId) return;

        myWeaponCount = count;

        if (weaponText != null)
            weaponText.text = $"무기카드 {myWeaponCount} / 2";
    }

    public void ShowBattleWinner(int winnerId)
    {
        if (isGameOver) return;
        if (battleResultText == null) return;

        if (battleTextCo != null)
            StopCoroutine(battleTextCo);

        battleTextCo = StartCoroutine(BattleWinnerRoutine(winnerId));
    }

    IEnumerator BattleWinnerRoutine(int winnerId)
    {
        battleResultText.text = $"Player {winnerId} 승리!";
        battleResultText.gameObject.SetActive(true);

        yield return new WaitForSeconds(1.5f);

        if (!isGameOver)
            battleResultText.gameObject.SetActive(false);
    }

    public void OnGameOver(int winnerId)
    {
        if (isGameOver) return;
        isGameOver = true;

        if (rollDiceButton != null)
            rollDiceButton.SetActive(false);

        if (purchaseUI != null)
            purchaseUI.gameObject.SetActive(false);

        if (battleTextCo != null)
            StopCoroutine(battleTextCo);

        if (battleResultText != null)
            battleResultText.gameObject.SetActive(false);

        if (gameOverTitleText != null)
            gameOverTitleText.text = $"Player {winnerId} 승리!";

        if (gameOverPanel != null)
            gameOverPanel.SetActive(true);
    }

    public void GoToRoomList()
    {
        if (WSClient.Instance != null)
        {
            WSClient.Instance.gameReadySent = false;
            WSClient.Instance.PendingTurnPlayerId = -1;
            WSClient.Instance.PendingGameOverWinnerId = -1;
            GameInfo.CurrentTurnPlayerId = -1;
        }

        SceneManager.LoadScene("MainLobby");
    }
}

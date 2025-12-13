using TMPro;
using UnityEngine;
using System.Collections;

public class DiceManager : MonoBehaviour
{
    public static DiceManager Instance;

    public TextMeshProUGUI diceText;
    public TileManager tileManager;
    public PlayerController[] players;
    public TilePurchaseUI purchaseUI;
    public GameObject rollDiceButton;

    int currentTurnPlayerId = -1;

    void Awake()
    {
        Instance = this;
    }

    void Start()
    {
        var ui = FindObjectOfType<LobbyUI>();
        if (ui != null)
            ui.gameObject.SetActive(false);

        players[0].playerId = 1;
        players[1].playerId = 2;

        if (rollDiceButton != null)
            rollDiceButton.SetActive(false);

        StartCoroutine(SendReadyWhenConnected());

        if (WSClient.Instance != null && WSClient.Instance.PendingTurnPlayerId != -1)
            OnTurnStart(WSClient.Instance.PendingTurnPlayerId);
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
        currentTurnPlayerId = playerId;
        UpdateButtonState();
    }

    public void OnDiceResult(int playerId, int dice)
    {
        if (diceText != null)
            diceText.text = dice.ToString();

        if (rollDiceButton != null)
            rollDiceButton.SetActive(false);

        PlayerController player = GetPlayer(playerId);
        if (player == null) return;

        player.Move(dice, tileManager.tiles);
    }

    PlayerController GetPlayer(int id)
    {
        foreach (var p in players)
            if (p.playerId == id)
                return p;
        return null;
    }

    public void RollDice()
    {
        Debug.Log($"[CLIENT] RollDice click myId={GameInfo.MyPlayerId}, turn={currentTurnPlayerId}");

        if (GameInfo.MyPlayerId != currentTurnPlayerId)
            return;

        if (rollDiceButton != null)
            rollDiceButton.SetActive(false);

        WSClient.Instance.SendRollDice();
    }

    void UpdateButtonState()
    {
        if (rollDiceButton == null) return;
        rollDiceButton.SetActive(GameInfo.MyPlayerId == currentTurnPlayerId);
    }
}

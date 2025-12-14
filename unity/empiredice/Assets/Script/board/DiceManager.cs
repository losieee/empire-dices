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
    public TextMeshProUGUI weaponText;
    public TextMeshProUGUI p1HpText;
    public TextMeshProUGUI p2HpText;

    public void OnHpUpdate(int playerId, int hp)
    {
        if (playerId == 1 && p1HpText != null) p1HpText.text = hp.ToString();
        if (playerId == 2 && p2HpText != null) p2HpText.text = hp.ToString();
    }

    int currentTurnPlayerId = -1;
    int myWeaponCount = 0;

    void Awake()
    {
        Instance = this;
        Debug.Log("[DiceManager] Awake");

        if (rollDiceButton != null)
            rollDiceButton.SetActive(false);

        ApplyBufferedTurnIfExists();
    }

    void Start()
    {
        Debug.Log("[DiceManager] Start");

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
        int buffered = -1;

        if (WSClient.Instance != null && WSClient.Instance.PendingTurnPlayerId != -1)
            buffered = WSClient.Instance.PendingTurnPlayerId;
        else if (GameInfo.CurrentTurnPlayerId != -1)
            buffered = GameInfo.CurrentTurnPlayerId;

        if (buffered != -1)
        {
            Debug.Log("[DiceManager] ApplyBufferedTurn=" + buffered);
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
        currentTurnPlayerId = playerId;
        GameInfo.CurrentTurnPlayerId = playerId;

        Debug.Log($"[TURN] now player {playerId}");

        UpdateButtonState();
    }

    void UpdateButtonState()
    {
        if (rollDiceButton == null) return;

        bool active = (GameInfo.MyPlayerId == currentTurnPlayerId);
        rollDiceButton.SetActive(active);
    }



    public void OnDiceResult(int playerId, int dice)
    {
        Debug.Log($"[DiceManager] OnDiceResult playerId={playerId}, dice={dice}");

        if (diceText != null) diceText.text = dice.ToString();
        if (rollDiceButton != null) rollDiceButton.SetActive(false);

        PlayerController player = GetPlayer(playerId);
        if (player == null)
        {
            Debug.LogError("[DiceManager] player is NULL for id=" + playerId);
            return;
        }

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
        Debug.Log($"[CLIENT] RollDice click myId={GameInfo.MyPlayerId}, turn={currentTurnPlayerId}");

        if (GameInfo.MyPlayerId != currentTurnPlayerId)
            return;

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
}

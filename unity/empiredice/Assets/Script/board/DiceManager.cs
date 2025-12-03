using UnityEngine;
using TMPro;

public class DiceManager : MonoBehaviour
{
    public TextMeshProUGUI diceText;
    public TileManager tileManager;
    public PlayerController player;
    public TilePurchaseUI purchaseUI;

    private void Start()
    {
        purchaseUI.gameObject.SetActive(false);
        player.OnTileArrived += HandleArrival;
    }

    void HandleArrival(int index)
    {
        Debug.Log("도착한 타일 번호 : " + index);

        
        purchaseUI.ShowForTile(index);
    }

    public void RollDice()
    {
        int dice = Random.Range(1, 7);  // 1~6
        diceText.text = dice.ToString();
        StartCoroutine(player.Move(dice, tileManager.tiles));
    }

    public void SelectToken(int index)
    {
        player.ChangeToken(index);
    }
}

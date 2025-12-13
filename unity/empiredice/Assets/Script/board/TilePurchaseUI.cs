using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class TilePurchaseUI : MonoBehaviour
{
    public TextMeshProUGUI titleText;
    public TextMeshProUGUI descText;
    public Button buyButton;
    public Button skipButton;
    public TileManager tileManager;

    int currentTileIndex = -1;

    void Awake()
    {
        buyButton.onClick.AddListener(OnClickBuy);
        skipButton.onClick.AddListener(OnClickSkip);
        gameObject.SetActive(false);
    }

    public void ShowForTile(int tileIndex)
    {
        TileData data = tileManager.GetTile(tileIndex);
        if (data == null) return;
        if (data.tileType != "territory") return;
        if (data.isOwned) return;
        if (GameInfo.MyPlayerId != GameInfo.CurrentTurnPlayerId) return;

        currentTileIndex = tileIndex;

        titleText.text = "영토 구매";
        descText.text = $"{data.grade} 영토를 구매하시겠습니까?";
        gameObject.SetActive(true);
    }

    void OnClickBuy()
    {
        if (currentTileIndex < 0) return;

        WSClient.Instance.SendBuyTerritory(currentTileIndex);
        Close();
    }

    void OnClickSkip()
    {
        Close();
    }

    void Close()
    {
        currentTileIndex = -1;
        gameObject.SetActive(false);
    }
}

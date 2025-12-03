using UnityEngine;
using TMPro;

public class PurchasePopup : MonoBehaviour
{
    public GameObject panel;
    public TextMeshProUGUI infoText;

    private int selectedTileIndex;

    public void Show(TileData tile, int index)
    {
        selectedTileIndex = index;
        infoText.text = $"{tile.flagCode} 땅을 구매하시겠습니까?";

        panel.SetActive(true);
    }

    public void OnBuy()
    {
        Debug.Log($"타일 {selectedTileIndex} 구매!");
        panel.SetActive(false);
        // 나중에 DB 연동
    }

    public void OnCancel()
    {
        Debug.Log("구매 취소");
        panel.SetActive(false);
    }
}
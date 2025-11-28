using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.Tilemaps;
using UnityEngine.UI;

public class TileController : MonoBehaviour
{
    public Image flagImage;
    public Image weaponCardImage;
    public TextMeshProUGUI gradeText;
    public TextMeshProUGUI specialText;

    public void SetupTile(TileData data)
    {
        // 기본 초기화
        flagImage.gameObject.SetActive(false);
        weaponCardImage.gameObject.SetActive(false);
        gradeText.gameObject.SetActive(false);
        specialText.gameObject.SetActive(false);

        switch (data.tileType)
        {
            case "territory":
                flagImage.sprite = Resources.Load<Sprite>("Flags/" + data.flagCode);
                flagImage.gameObject.SetActive(true);

                gradeText.text = data.grade;       // "강대국", "약소국"
                gradeText.gameObject.SetActive(true);
                break;

            case "weapon":
                weaponCardImage.gameObject.SetActive(true);
                break;

            default: // 출발, 침묵, 강탈, 무인도
                specialText.text = data.tileType; // or GetKoreanLabel()
                specialText.gameObject.SetActive(true);
                break;
        }
    }
}

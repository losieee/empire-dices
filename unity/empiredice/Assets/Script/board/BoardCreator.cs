using System.Collections.Generic;
using UnityEngine;

public class BoardCreator : MonoBehaviour
{
    public GameObject tilePrefab;
    public RectTransform boardParent;

    public int columns = 6;
    public int rows = 6;
    public float spacing = 12f;
    public TileManager tileManager;

    List<TileData> tileDataList;

    void Start()
    {
        GenerateDummyData();
        GenerateBoard();
    }

    void GenerateDummyData()
    {
        tileDataList = new List<TileData>()
        {
            new TileData(){ tileType="start" },                                     // 0 bottom-left
            new TileData(){ tileType="territory", grade="약소국", flagCode="KP" },
            new TileData(){ tileType="territory", grade="약소국", flagCode="MN" },
            new TileData(){ tileType="weapon" },                                    // 3 bottom
            new TileData(){ tileType="territory", grade="강대국", flagCode="US" },
            new TileData(){ tileType="island" },                                    // 5 right bottom
            new TileData(){ tileType="territory", grade="약소국", flagCode="SO" },
            new TileData(){ tileType="territory", grade="약소국", flagCode="IQ" },
            new TileData(){ tileType="weapon" },                                    // 8 right weapon
            new TileData(){ tileType="territory", grade="강대국", flagCode="CH" },
            new TileData(){ tileType="silent" },                                    // 10 right top
            new TileData(){ tileType="territory", grade="약소국", flagCode="IR" },
            new TileData(){ tileType="territory", grade="약소국", flagCode="CU" },
            new TileData(){ tileType="weapon" },                                    // 13 top
            new TileData(){ tileType="territory", grade="강대국", flagCode="RU" },
            new TileData(){ tileType="steal" },                                     // 15 left top
            new TileData(){ tileType="territory", grade="약소국", flagCode="MV" },
            new TileData(){ tileType="territory", grade="약소국", flagCode="AF" },
            new TileData(){ tileType="weapon" },                                    // 18 left
            new TileData(){ tileType="territory", grade="강대국", flagCode="KR" }   // 19 bottom
        };
    }

    void GenerateBoard()
    {
        tileManager.tiles.Clear();   // remove old

        float boardWidth = boardParent.rect.width;
        float boardHeight = boardParent.rect.height;

        float cellSizeX = (boardWidth - spacing * (columns - 1)) / columns;
        float cellSizeY = (boardHeight - spacing * (rows - 1)) / rows;

        float totalWidth = (columns * cellSizeX) + ((columns - 1) * spacing);
        float totalHeight = (rows * cellSizeY) + ((rows - 1) * spacing);

        float startX = -(totalWidth / 2f) + cellSizeX / 2f;
        float startY = (totalHeight / 2f) - cellSizeY / 2f;

        List<Vector2> positions = new List<Vector2>();

        // bottom row
        for (int c = 0; c < columns; c++)
            positions.Add(new Vector2(startX + c * (cellSizeX + spacing), startY - (rows - 1) * (cellSizeY + spacing)));

        // right column
        for (int r = rows - 2; r > 0; r--)
            positions.Add(new Vector2(startX + (columns - 1) * (cellSizeX + spacing), startY - r * (cellSizeY + spacing)));

        // top row
        for (int c = columns - 1; c >= 0; c--)
            positions.Add(new Vector2(startX + c * (cellSizeX + spacing), startY));

        // left column
        for (int r = 1; r < rows - 1; r++)
            positions.Add(new Vector2(startX, startY - r * (cellSizeY + spacing)));

        // Instantiate tiles
        for (int i = 0; i < positions.Count; i++)
        {
            GameObject tile = Instantiate(tilePrefab, boardParent, false);
            RectTransform rt = tile.GetComponent<RectTransform>();

            rt.sizeDelta = new Vector2(cellSizeX, cellSizeY);
            rt.anchoredPosition = positions[i];

            var controller = tile.GetComponent<TileController>();
            controller.SetupTile(tileDataList[i]);

            
            switch (i)
            {
                case 0:
                    controller.SetSpecialText("출발");
                    break;
                case 5:
                    controller.SetSpecialText("무인도");
                    break;
                case 10:
                    controller.SetSpecialText("침묵");
                    break;
                case 15:
                    controller.SetSpecialText("강탈");
                    break;
                default:
                    controller.SetSpecialText("");
                    break;
            }

            tileManager.tiles.Add(tile.transform); 
        }
    }
}

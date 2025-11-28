using System.Collections.Generic;
using UnityEngine;

public class BoardCreator : MonoBehaviour
{
    public GameObject tilePrefab;
    public RectTransform boardParent;

    public int columns = 6;
    public int rows = 6;
    public float spacing = 12f;

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
        new TileData(){ tileType="start" },                                     // bottom-left
        new TileData(){ tileType="territory", grade="약소국", flagCode="KP" },
        new TileData(){ tileType="territory", grade="약소국", flagCode="MN" },
        new TileData(){ tileType="weapon" },                           // bottom weapon
        new TileData(){ tileType="territory", grade="강대국", flagCode="US" },
        new TileData(){ tileType="island" },                           // right bottom
        new TileData(){ tileType="territory", grade="약소국", flagCode="SO" },
        new TileData(){ tileType="territory", grade="약소국", flagCode="IQ" },
        new TileData(){ tileType="weapon" },                           // right weapon
        new TileData(){ tileType="territory", grade="강대국", flagCode="CH" },
        new TileData(){ tileType="silence" },                          // right top
        new TileData(){ tileType="territory", grade="약소국", flagCode="IR" },
        new TileData(){ tileType="territory", grade="약소국", flagCode="CU" },
        new TileData(){ tileType="weapon" },                           // top weapon
        new TileData(){ tileType="territory", grade="강대국", flagCode="RU" },
        new TileData(){ tileType="steal" },                            // left top
        new TileData(){ tileType="territory", grade="약소국", flagCode="MV" },
        new TileData(){ tileType="territory", grade="약소국", flagCode="AF" },
        new TileData(){ tileType="weapon" },
        new TileData(){ tileType="territory", grade="강대국", flagCode="KR" }
    };
    }


    void GenerateBoard()
    {
        float boardWidth = boardParent.rect.width;
        float boardHeight = boardParent.rect.height;

        float cellSizeX = (boardWidth - spacing * (columns - 1)) / columns;
        float cellSizeY = (boardHeight - spacing * (rows - 1)) / rows;

        float totalWidth = (columns * cellSizeX) + ((columns - 1) * spacing);
        float totalHeight = (rows * cellSizeY) + ((rows - 1) * spacing);

        float startX = -(totalWidth / 2f) + cellSizeX / 2f;
        float startY = (totalHeight / 2f) - cellSizeY / 2f;

        List<Vector2> positions = new List<Vector2>();

        // bottom row (left to right)
        for (int c = 0; c < columns; c++)
            positions.Add(new Vector2(startX + c * (cellSizeX + spacing), startY - (rows - 1) * (cellSizeY + spacing)));

        // right column (bottom to top)
        for (int r = rows - 2; r > 0; r--)
            positions.Add(new Vector2(startX + (columns - 1) * (cellSizeX + spacing), startY - r * (cellSizeY + spacing)));

        // top row (right to left)
        for (int c = columns - 1; c >= 0; c--)
            positions.Add(new Vector2(startX + c * (cellSizeX + spacing), startY));

        // left column (top to bottom)
        for (int r = 1; r < rows - 1; r++)
            positions.Add(new Vector2(startX, startY - r * (cellSizeY + spacing)));

        // instantiate tiles
        for (int i = 0; i < positions.Count; i++)
        {
            GameObject tile = Instantiate(tilePrefab, boardParent, false);
            RectTransform rt = tile.GetComponent<RectTransform>();

            rt.sizeDelta = new Vector2(cellSizeX, cellSizeY);
            rt.anchoredPosition = positions[i];

            tile.GetComponent<TileController>().SetupTile(tileDataList[i]);
        }
    }


}




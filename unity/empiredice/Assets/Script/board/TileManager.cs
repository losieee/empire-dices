using System.Collections.Generic;
using UnityEngine;

public class TileManager : MonoBehaviour
{
    public static TileManager Instance;
    public List<Transform> tiles = new List<Transform>();   // 이미 쓰는 리스트
    public List<TileData> tileDatas = new List<TileData>(); // 각 인덱스별 TileData


    private void Awake()
    {
        Instance = this;
    }
    public TileData GetTile(int index)
    {
        if (index < 0 || index >= tileDatas.Count)
        {
            Debug.LogError($"Tile index out of range: {index}");
            return null;
        }

        return tileDatas[index];
    }
}
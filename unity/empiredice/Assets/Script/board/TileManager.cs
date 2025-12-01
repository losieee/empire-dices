using System.Collections.Generic;
using UnityEngine;

public class TileManager : MonoBehaviour
{
    public List<Transform> tiles = new List<Transform>();

    public Transform GetTile(int index)
    {
        return tiles[index];
    }
}

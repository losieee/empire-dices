using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class PlayerController : MonoBehaviour
{
    public int currentIndex = 0;
    public float moveSpeed = 0.25f;

    public Image tokenImage;
    public Sprite[] tokenSprites;

    public System.Action<int> OnTileArrived;

    public IEnumerator Move(int steps, List<Transform> tiles)
    {
        for (int i = 0; i < steps; i++)
        {
            currentIndex++;
            if (currentIndex >= tiles.Count) currentIndex = 0;

            Vector3 targetPos = tiles[currentIndex].position;

            while (Vector3.Distance(transform.position, targetPos) > 0.05f)
            {
                transform.position = Vector3.MoveTowards(transform.position, targetPos, moveSpeed);
                yield return null;
            }

            yield return new WaitForSeconds(0.1f);
        }

        Debug.Log("플레이어 이동 후 위치 : " + currentIndex);
        OnTileArrived?.Invoke(currentIndex); 
        yield break;
    }


    public void ChangeToken(int index)
    {
        tokenImage.sprite = tokenSprites[index];
    }
}

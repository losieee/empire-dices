using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class PlayerController : MonoBehaviour
{
    public int currentIndex = 0;
    public float moveSpeed = 0.25f;

    public Image tokenImage;        // PlayerToken에 있는 Image
    public Sprite[] tokenSprites;   // 말 종류 스프라이트 배열

    // --- 이동 코루틴 ---
    public IEnumerator Move(int steps, List<Transform> tiles)
    {
        for (int i = 0; i < steps; i++)
        {
            currentIndex++;

            if (currentIndex >= tiles.Count)
                currentIndex = 0;   // 한 바퀴 돌면 0으로

            Vector3 targetPos = tiles[currentIndex].position;

            while (Vector3.Distance(transform.position, targetPos) > 0.05f)
            {
                transform.position = Vector3.MoveTowards(transform.position, targetPos, moveSpeed);
                yield return null;
            }

            yield return new WaitForSeconds(0.1f);
        }

        Debug.Log("도착 tile index : " + currentIndex);
    }

    // --- 말 변경 로직 ---
    public void ChangeToken(int index)
    {
        if (tokenSprites.Length == 0) return;

        tokenImage.sprite = tokenSprites[index];
    }
}

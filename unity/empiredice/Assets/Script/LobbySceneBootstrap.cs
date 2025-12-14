using UnityEngine;

public class LobbySceneBootstrap : MonoBehaviour
{
    void Start()
    {
        
        LobbyUI lobby = LobbyUI.Instance;

        if (lobby == null)
        {
            // includeInactive = true
            lobby = FindObjectOfType<LobbyUI>(true);
        }

       
        if (lobby == null)
        {
            var all = Resources.FindObjectsOfTypeAll<LobbyUI>();
            if (all != null && all.Length > 0) lobby = all[0];
        }

        if (lobby == null)
        {
            Debug.LogError("[LobbySceneBootstrap] LobbyUI not found!");
            return;
        }

        var canvas = lobby.GetComponentInParent<Canvas>(true);
        if (canvas != null) canvas.gameObject.SetActive(true);

        lobby.gameObject.SetActive(true);

       
        lobby.ShowRoomList();

        Debug.Log("[LobbySceneBootstrap] LobbyUI enabled + ShowRoomList()");
    }
}

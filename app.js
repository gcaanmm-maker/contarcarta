//oi
let playerId = crypto.randomUUID();
    container.appendChild(div);
  });
}

async function loadRoomInfo() {

  const { data } = await supabaseClient
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .single();

  document.getElementById('level').innerText = data.level;

  document.getElementById('lives').innerText = data.lives;
}

function listenRealtime() {

  supabaseClient
    .channel('players-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'players'
      },
      () => {
        loadPlayers();
      }
    )
    .subscribe();

  supabaseClient
    .channel('played-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'played_cards'
      },
      () => {
        loadPlayedCards();
      }
    )
    .subscribe();

  supabaseClient
    .channel('rooms-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms'
      },
      () => {
        loadRoomInfo();
      }
    )
    .subscribe();
}

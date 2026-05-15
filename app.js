let playerId = crypto.randomUUID();
let playerName = '';
let roomCode = '';

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

async function createRoom() {

  playerName = document.getElementById('playerName').value;

  if (!playerName) {
    alert('Digite seu nome');
    return;
  }

  roomCode = generateRoomCode();

  const { error } = await supabaseClient
    .from('rooms')
    .insert({
      code: roomCode
    });

  if (error) {
    console.error(error);
    alert('Erro ao criar sala');
    return;
  }

  await addPlayer();

  openGame();
}

async function joinRoom() {

  playerName = document.getElementById('playerName').value;

  roomCode = document
    .getElementById('roomCode')
    .value
    .toUpperCase();

  if (!playerName || !roomCode) {
    alert('Preencha tudo');
    return;
  }

  const { data, error } = await supabaseClient
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .single();

  if (error || !data) {
    alert('Sala não encontrada');
    return;
  }

  await addPlayer();

  openGame();
}

async function addPlayer() {

  const { error } = await supabaseClient
    .from('players')
    .insert({
      id: playerId,
      room_code: roomCode,
      name: playerName,
      cards: []
    });

  if (error) {
    console.error(error);
  }
}

function openGame() {

  document
    .getElementById('loginScreen')
    .classList
    .add('hidden');

  document
    .getElementById('gameScreen')
    .classList
    .remove('hidden');

  document.getElementById('roomText').innerText = roomCode;

  listenRealtime();

  loadRoom();
}

async function startGame() {

  const { data: room } = await supabaseClient
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .single();

  if (room.started) {
    return;
  }

  let deck = [];

  for (let i = 1; i <= 100; i++) {
    deck.push(i);
  }

  deck.sort(() => Math.random() - 0.5);

  const { data: players } = await supabaseClient
    .from('players')
    .select('*')
    .eq('room_code', roomCode);

  let index = 0;

  for (const player of players) {

    let cards = [deck[index]];
    index++;

    await supabaseClient
      .from('players')
      .update({
        cards: cards
      })
      .eq('id', player.id);
  }

  await supabaseClient
    .from('rooms')
    .update({
      started: true
    })
    .eq('code', roomCode);
}

async function playCard(card) {

  await supabaseClient
    .from('played_cards')
    .insert({
      room_code: roomCode,
      value: card
    });

  const { data: player } = await supabaseClient
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  let cards = player.cards.filter(c => c !== card);

  await supabaseClient
    .from('players')
    .update({
      cards: cards
    })
    .eq('id', playerId);
}

async function loadRoom() {

  await loadPlayers();

  await loadPlayedCards();

  await loadRoomInfo();
}

async function loadPlayers() {

  const { data } = await supabaseClient
    .from('players')
    .select('*')
    .eq('room_code', roomCode);

  const container = document.getElementById('players');

  container.innerHTML = '';

  data.forEach(player => {

    let cardsHTML = '';

    if (player.id === playerId) {

      player.cards.forEach(card => {

        cardsHTML += `
          <div class="card" onclick="playCard(${card})">
            ${card}
          </div>
        `;
      });

    } else {

      player.cards.forEach(() => {

        cardsHTML += `
          <div class="fake-card"></div>
        `;
      });
    }

    const div = document.createElement('div');

    div.className = 'player';

    div.innerHTML = `
      <h2>${player.name}</h2>

      <div class="cards">
        ${cardsHTML}
      </div>
    `;

    container.appendChild(div);
  });
}

async function loadPlayedCards() {

  const { data } = await supabaseClient
    .from('played_cards')
    .select('*')
    .eq('room_code', roomCode)
    .order('value');

  const container = document.getElementById('playedCards');

  container.innerHTML = '';

  data.forEach(card => {

    const div = document.createElement('div');

    div.className = 'played-card';

    div.innerText = card.value;

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

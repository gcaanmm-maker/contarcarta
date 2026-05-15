//oi3
let playerId = crypto.randomUUID();
let playerName = '';
let roomCode = '';

const MAX_LEVEL = 12;

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function showMessage(text, color = '#22c55e') {

  let old = document.getElementById('gameMessage');

  if (old) {
    old.remove();
  }

  const div = document.createElement('div');

  div.id = 'gameMessage';

  div.style.marginTop = '20px';
  div.style.padding = '16px';
  div.style.borderRadius = '14px';
  div.style.background = color;
  div.style.fontWeight = 'bold';
  div.style.textAlign = 'center';
  div.style.fontSize = '20px';

  div.innerText = text;

  document.querySelector('.table').appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 3000);
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
      code: roomCode,
      level: 1,
      lives: 3,
      started: false
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

  const { data } = await supabaseClient
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .single();

  if (!data) {
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

  await clearPlayedCards();

  await distributeCards(room.level);

  await supabaseClient
    .from('rooms')
    .update({
      started: true
    })
    .eq('code', roomCode);

  showMessage('Partida iniciada!', '#2563eb');
}

async function distributeCards(level) {

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

    let cards = [];

    for (let i = 0; i < level; i++) {
      cards.push(deck[index]);
      index++;
    }

    cards.sort((a, b) => a - b);

    await supabaseClient
      .from('players')
      .update({
        cards: cards
      })
      .eq('id', player.id);
  }

  loadPlayers();
}

async function clearPlayedCards() {

  await supabaseClient
    .from('played_cards')
    .delete()
    .eq('room_code', roomCode);
}

async function playCard(card) {

  const { data: players } = await supabaseClient
    .from('players')
    .select('*')
    .eq('room_code', roomCode);

  let allCards = [];

  players.forEach(player => {
    allCards.push(...player.cards);
  });

  const smallestCard = Math.min(...allCards);

  if (card !== smallestCard) {

    await handleMistake(card, smallestCard);

    return;
  }

  await supabaseClient
    .from('played_cards')
    .insert({
      room_code: roomCode,
      value: card
    });

  const currentPlayer = players.find(
    p => p.id === playerId
  );

  let updatedCards = currentPlayer.cards.filter(
    c => c !== card
  );

  await supabaseClient
    .from('players')
    .update({
      cards: updatedCards
    })
    .eq('id', playerId);

  await checkLevelComplete();

  loadPlayers();
}

async function handleMistake(cardPlayed, smallestCard) {

  const { data: room } = await supabaseClient
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .single();

  let newLives = room.lives - 1;

  await supabaseClient
    .from('rooms')
    .update({
      lives: newLives
    })
    .eq('code', roomCode);

  const { data: players } = await supabaseClient
    .from('players')
    .select('*')
    .eq('room_code', roomCode);

  for (const player of players) {

    const lowerCards = player.cards.filter(
      c => c < cardPlayed
    );

    for (const lowerCard of lowerCards) {

      await supabaseClient
        .from('played_cards')
        .insert({
          room_code: roomCode,
          value: lowerCard
        });
    }

    const remaining = player.cards.filter(
      c => c >= cardPlayed
    );

    await supabaseClient
      .from('players')
      .update({
        cards: remaining
      })
      .eq('id', player.id);
  }

  showMessage(
    `Erro! A menor carta era ${smallestCard}`,
    '#dc2626'
  );

  if (newLives <= 0) {
    await gameOver();
  }

  loadPlayers();
}

async function checkLevelComplete() {

  const { data: players } = await supabaseClient
    .from('players')
    .select('*')
    .eq('room_code', roomCode);

  let remaining = 0;

  players.forEach(player => {
    remaining += player.cards.length;
  });

  if (remaining > 0) {
    return;
  }

  const { data: room } = await supabaseClient
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .single();

  if (room.level >= MAX_LEVEL) {

    showMessage(
      'VOCÊS VENCERAM!',
      '#16a34a'
    );

    return;
  }

  const nextLevel = room.level + 1;

  await supabaseClient
    .from('rooms')
    .update({
      level: nextLevel,
      started: false
    })
    .eq('code', roomCode);

  showMessage(
    `Nível ${nextLevel}!`,
    '#7c3aed'
  );
}

async function gameOver() {

  await supabaseClient
    .from('rooms')
    .update({
      started: false,
      level: 1,
      lives: 3
    })
    .eq('code', roomCode);

  await clearPlayedCards();

  const { data: players } = await supabaseClient
    .from('players')
    .select('*')
    .eq('room_code', roomCode);

  for (const player of players) {

    await supabaseClient
      .from('players')
      .update({
        cards: []
      })
      .eq('id', player.id);
  }

  showMessage(
    'FIM DE JOGO!',
    '#dc2626'
  );

  loadPlayers();
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

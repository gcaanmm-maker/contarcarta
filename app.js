//oi2
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

  await supabaseClient
    .from('players')
    .insert({
      id: playerId,
      room_code: roomCode,
      name: playerName,
      cards: []
    });
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
}

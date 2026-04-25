import { io, Socket } from 'socket.io-client';

type TrackResponse = {
  success: boolean;
  data?: {
    realtime?: {
      baseUrl?: string;
      room?: string;
      orderRoom?: string;
    };
  };
  message?: string;
};

function getEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

async function fetchTrackingSnapshot(baseUrl: string, deliveryId: string, authToken: string) {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${baseUrl}/api/deliveries/${deliveryId}/track`, {
    method: 'GET',
    headers
  });

  const json = (await response.json().catch(() => null)) as TrackResponse | null;
  return {
    ok: response.ok,
    status: response.status,
    json
  };
}

async function waitForSocketEvents(socket: Socket, room: string, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      reject(new Error(`Timeout aguardando eventos realtime para ${room}`));
    }, timeoutMs);

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve();
    };

    socket.on('connect', () => {
      console.log(`Socket conectado: ${socket.id}`);
      socket.emit('tracking:join', { topic: room });
    });

    socket.on('tracking:connected', (event) => {
      console.log('Evento tracking:connected recebido');
      console.log(JSON.stringify(event, null, 2));
    });

    socket.on('tracking:snapshot', (event) => {
      console.log('Evento tracking:snapshot recebido');
      console.log(JSON.stringify(event, null, 2));
      finish();
    });

    socket.on('tracking:update', (event) => {
      console.log('Evento tracking:update recebido');
      console.log(JSON.stringify(event, null, 2));
      finish();
    });

    socket.on('connect_error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function main() {
  const baseUrl = getEnv('SMOKE_BASE_URL', 'http://127.0.0.1:4203').replace(/\/$/, '');
  const deliveryId = getEnv('SMOKE_DELIVERY_ID');
  const authToken = getEnv('SMOKE_AUTH_TOKEN');
  const timeoutMs = Number(getEnv('SMOKE_TIMEOUT_MS', '15000'));

  if (!deliveryId) {
    throw new Error('Defina SMOKE_DELIVERY_ID para executar o smoke test');
  }

  let socketBaseUrl = getEnv('SMOKE_SOCKET_URL', baseUrl).replace(/\/$/, '');
  let room = getEnv('SMOKE_ROOM', `delivery:${deliveryId}`);

  const trackingResponse = await fetchTrackingSnapshot(baseUrl, deliveryId, authToken);
  if (trackingResponse.ok && trackingResponse.json?.data?.realtime) {
    socketBaseUrl = trackingResponse.json.data.realtime.baseUrl?.replace(/\/$/, '') || socketBaseUrl;
    room = trackingResponse.json.data.realtime.room || room;
    console.log(`Snapshot HTTP validado com sucesso para ${deliveryId}`);
  } else {
    console.warn(`Nao foi possivel validar o snapshot HTTP (${trackingResponse.status}).`);
    if (trackingResponse.json?.message) {
      console.warn(`Mensagem da API: ${trackingResponse.json.message}`);
    }
    console.warn(`Continuando apenas com o socket na sala ${room}.`);
  }

  const socket = io(socketBaseUrl, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    extraHeaders: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
  });

  try {
    console.log(`Conectando ao socket em ${socketBaseUrl} e entrando na sala ${room}`);
    await waitForSocketEvents(socket, room, timeoutMs);
    console.log('Smoke test realtime concluido com sucesso');
  } finally {
    socket.disconnect();
  }
}

main().catch((error) => {
  console.error('Smoke test realtime falhou');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

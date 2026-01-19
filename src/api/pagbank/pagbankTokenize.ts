type CardTokenInput = {
  number: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  holderName: string;
};

type PagbankGlobalKey = 'PagSeguroEncryptedCard' | 'PagSeguro' | 'PagBank';

const SDK_SCRIPT_URLS = [
  'https://sandbox.sdk.pagseguro.com/checkout-sdk-js/1.0.0/pagseguro.min.js',
  'https://assets.pagseguro.com.br/checkout-sdk-js/1.0.0/pagseguro.min.js',
];

const SDK_GLOBAL_KEYS: PagbankGlobalKey[] = ['PagSeguroEncryptedCard', 'PagSeguro', 'PagBank'];

let sdkLoadPromise: Promise<void> | null = null;

const getGlobalSdk = (): { key: PagbankGlobalKey; value: any } | null => {
  if (typeof window === 'undefined') return null;
  for (const key of SDK_GLOBAL_KEYS) {
    const value = (window as any)[key];
    if (value) {
      return { key, value };
    }
  }
  return null;
};

const waitForSdk = async (timeoutMs = 6000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (getGlobalSdk()) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('SDK PagBank carregou script mas não expôs objeto global.');
};

const loadScript = (src: string, timeoutMs = 6000) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
    }

    const script = existing ?? document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.pagbankSdk = 'true';

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout ao carregar SDK PagBank (${src}). Verifique AdBlock/CSP.`));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timer);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };

    const onLoad = () => {
      cleanup();
      script.dataset.loaded = 'true';
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error(`Falha ao carregar SDK PagBank (${src}).`));
    };

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });

    if (!existing) document.head.appendChild(script);
  });

export const loadPagbankSdk = async (): Promise<void> => {
  if (getGlobalSdk()) return;
  if (sdkLoadPromise) {
    await sdkLoadPromise;
    return;
  }

  sdkLoadPromise = (async () => {
    for (const src of SDK_SCRIPT_URLS) {
      try {
        await loadScript(src);
        await waitForSdk();
        if (getGlobalSdk()) {
          return;
        }
      } catch {
        // Try next fallback URL
      }
    }

    if (!getGlobalSdk()) {
      throw new Error('SDK PagBank não carregou.');
    }
  })();

  await sdkLoadPromise;
};

const normalizeCardNumber = (value: string) => value.replace(/\s+/g, '').trim();

const extractToken = (result: any): string | null => {
  if (!result) return null;
  if (typeof result === 'string') return result;
  if (result.card_token) return result.card_token;
  if (result.cardToken) return result.cardToken;
  if (result.encryptedCard) return result.encryptedCard;
  if (result.encrypted_card) return result.encrypted_card;
  if (result.token) return result.token;
  if (result.card?.token) return result.card.token;
  if (result.data?.card_token) return result.data.card_token;
  return null;
};

const getSdkToken = async (input: CardTokenInput): Promise<string> => {
  const sdk = getGlobalSdk();
  if (!sdk) {
    throw new Error('SDK PagBank não carregou.');
  }

  const publicKey = import.meta.env.VITE_PAGBANK_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('Chave pública do PagBank não configurada.');
  }

  if (sdk.key === 'PagSeguroEncryptedCard') {
    const encryptedCard = new sdk.value({
      publicKey,
      holder: input.holderName,
      number: input.number,
      expMonth: input.expMonth,
      expYear: input.expYear,
      securityCode: input.cvv,
    });

    const hasErrors =
      typeof encryptedCard.hasErrors === 'function' ? encryptedCard.hasErrors() : encryptedCard.hasErrors;
    if (hasErrors) {
      throw new Error('Cartão inválido.');
    }

    const encryptedResult =
      typeof encryptedCard.encrypt === 'function' ? encryptedCard.encrypt() : extractToken(encryptedCard);
    const token = extractToken(encryptedResult);
    if (!token) {
      throw new Error('Tokenização falhou.');
    }
    return token;
  }

  const sdkClient = sdk.value;
  const payload = {
    publicKey,
    holderName: input.holderName,
    number: input.number,
    expMonth: input.expMonth,
    expYear: input.expYear,
    cvv: input.cvv,
  };

  const result =
    (sdkClient?.createCardToken && (await sdkClient.createCardToken(payload))) ||
    (sdkClient?.encryptCard && (await sdkClient.encryptCard(payload))) ||
    (sdkClient?.tokenize && (await sdkClient.tokenize(payload)));

  const token = extractToken(result);
  if (!token) {
    throw new Error('Tokenização falhou.');
  }
  return token;
};

export const createCardToken = async (input: CardTokenInput): Promise<string> => {
  const sanitizedNumber = normalizeCardNumber(input.number);
  const expMonth = input.expMonth.trim();
  let expYear = input.expYear.trim();
  if (/^\d{2}$/.test(expYear)) {
    expYear = `20${expYear}`;
  }
  const cvv = input.cvv.trim();
  const holderName = input.holderName.trim();

  if (!/^\d{13,19}$/.test(sanitizedNumber)) {
    throw new Error('Cartão inválido.');
  }
  if (!/^\d{2}$/.test(expMonth) || Number(expMonth) < 1 || Number(expMonth) > 12) {
    throw new Error('Mês inválido.');
  }
  if (!/^\d{4}$/.test(expYear)) {
    throw new Error('Ano inválido.');
  }
  if (!/^\d{3,4}$/.test(cvv)) {
    throw new Error('CVV inválido.');
  }
  if (!holderName) {
    throw new Error('Nome do titular inválido.');
  }

  await loadPagbankSdk();

  return getSdkToken({
    ...input,
    number: sanitizedNumber,
    expMonth,
    expYear,
    cvv,
    holderName,
  });
};

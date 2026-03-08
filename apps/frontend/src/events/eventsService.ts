import {
  BalanceDto,
  BalancesResponse,
  ResponseError,
  SettlementAlgorithm
} from "@contracts/client";
import { apiBasePath, balancesApi, eventsApi, peopleApi } from "../api/contractsClient";
import { getAccessToken } from "../auth/sessionStore";

export type UiSettlementAlgorithm = "min-transfer" | "pairwise";

export type EventSummary = {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  settlementAlgorithm: UiSettlementAlgorithm;
};

export type EventPerson = {
  id: string;
  displayName: string;
  linkedAccountId: string | null;
};

export type EventEntry = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  payerPersonId: string;
  occurredAtUtc: string;
  type?: "EXPENSE" | "INCOME";
  note?: string | null;
};

export type EventDetails = {
  event: EventSummary;
  people: EventPerson[];
  entries: EventEntry[];
};

export type EventBalanceCounterparty = {
  counterpartyPersonId: string;
  amount: string;
  currency: string;
};

export type EventBalance = {
  personId: string;
  netAmount: string;
  owes: EventBalanceCounterparty[];
  owedBy: EventBalanceCounterparty[];
};

export type EventBalances = {
  eventId: string;
  currency: string;
  algorithm: UiSettlementAlgorithm;
  balances: EventBalance[];
};

type EntriesResponse = {
  items?: Array<{
    id?: string;
    type?: "EXPENSE" | "INCOME";
    name?: string;
    eventAmount?: string | number;
    amount?: string | number;
    currency?: string;
    payerPersonId?: string;
    occurredAtUtc?: string;
    note?: string | null;
  }>;
};

type EntryResponse = {
  entry?: {
    id?: string;
    type?: "EXPENSE" | "INCOME";
    name?: string;
    eventAmount?: string | number;
    amount?: string | number;
    currency?: string;
    payerPersonId?: string;
    occurredAtUtc?: string;
    note?: string | null;
  };
};

type EventSettingsUpdate = {
  name: string;
  timezone: string;
  settlementAlgorithm: UiSettlementAlgorithm;
};

type CreateEventInput = {
  name: string;
  currency: string;
  timezone: string;
  settlementAlgorithm: UiSettlementAlgorithm;
  participants: string[];
};

export type UiSplitMode = "EVEN" | "PERCENT" | "AMOUNT";

export type CreateEntryInput = {
  eventId: string;
  type: "EXPENSE" | "INCOME";
  name: string;
  amount: string;
  currency: string;
  payerPersonId: string;
  occurredAtUtc: string;
  note?: string;
  participants: Array<{
    personId: string;
    splitMode: UiSplitMode;
    splitPercent?: string;
    splitAmount?: string;
  }>;
};

function toApiAlgorithm(value: UiSettlementAlgorithm): SettlementAlgorithm {
  return value === "pairwise" ? SettlementAlgorithm.PAIRWISE : SettlementAlgorithm.MIN_TRANSFER;
}

function toUiAlgorithm(value: SettlementAlgorithm): UiSettlementAlgorithm {
  return value === SettlementAlgorithm.PAIRWISE ? "pairwise" : "min-transfer";
}

function mapEventSummary(value: {
  id: string;
  name: string;
  baseCurrency: string;
  timezone: string;
  defaultSettlementAlgorithm: SettlementAlgorithm;
}): EventSummary {
  return {
    id: value.id,
    name: value.name,
    currency: value.baseCurrency,
    timezone: value.timezone,
    settlementAlgorithm: toUiAlgorithm(value.defaultSettlementAlgorithm)
  };
}

function mapEventEntry(value: {
  id?: string;
  type?: "EXPENSE" | "INCOME";
  name?: string;
  eventAmount?: string | number;
  amount?: string | number;
  currency?: string;
  payerPersonId?: string;
  occurredAtUtc?: string;
  note?: string | null;
}): EventEntry {
  return {
    id: value.id ?? "",
    type: value.type,
    name: value.name ?? "",
    amount: String(value.eventAmount ?? value.amount ?? "0"),
    currency: value.currency ?? "EUR",
    payerPersonId: value.payerPersonId ?? "",
    occurredAtUtc: value.occurredAtUtc ?? "",
    note: value.note ?? null
  };
}

function mapBalanceDto(value: BalanceDto): EventBalance {
  return {
    personId: value.personId,
    netAmount: value.netAmountInEventCurrency,
    owes: value.owes.map((entry) => ({
      counterpartyPersonId: entry.counterpartyPersonId,
      amount: entry.amount.amount,
      currency: entry.amount.currency
    })),
    owedBy: value.owedBy.map((entry) => ({
      counterpartyPersonId: entry.counterpartyPersonId,
      amount: entry.amount.amount,
      currency: entry.amount.currency
    }))
  };
}

export async function fetchEvents(): Promise<EventSummary[]> {
  const response = await eventsApi.eventsGet({ page: 1, pageSize: 50 });
  return response.items.map(mapEventSummary);
}

export async function createEvent(input: CreateEventInput): Promise<EventSummary> {
  const created = await eventsApi.eventsPost({
    createEventRequest: {
      name: input.name,
      baseCurrency: input.currency,
      timezone: input.timezone,
      defaultSettlementAlgorithm: toApiAlgorithm(input.settlementAlgorithm)
    }
  });

  await Promise.all(
    input.participants.map((person) =>
      peopleApi.eventsEventIdPeoplePost({
        eventId: created.event.id,
        createPersonRequest: {
          displayName: person
        }
      })
    )
  );

  return mapEventSummary(created.event);
}

async function fetchEventEntries(eventId: string): Promise<EventEntry[]> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return [];
  }

  const response = await fetch(`${apiBasePath}/events/${eventId}/entries`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as EntriesResponse;
  return (payload.items ?? [])
    .filter((entry): entry is Required<EntriesResponse>["items"][number] => Boolean(entry.id && entry.name))
    .map(mapEventEntry);
}

export async function fetchEventDetails(eventId: string): Promise<EventDetails> {
  const [details, entries] = await Promise.all([
    eventsApi.eventsEventIdGet({ eventId }),
    fetchEventEntries(eventId)
  ]);

  return {
    event: mapEventSummary(details.event),
    people: details.people.map((person) => ({
      id: person.id,
      displayName: person.displayName,
      linkedAccountId: person.linkedAccountId ?? null
    })),
    entries
  };
}

export async function fetchEventBalances(
  eventId: string,
  algorithm?: UiSettlementAlgorithm
): Promise<EventBalances> {
  const response: BalancesResponse = await balancesApi.eventsEventIdBalancesGet({
    eventId,
    algorithm: algorithm ? toApiAlgorithm(algorithm) : undefined
  });

  return {
    eventId: response.eventId,
    currency: response.currency,
    algorithm: toUiAlgorithm(response.algorithm),
    balances: response.balances.map(mapBalanceDto)
  };
}

export async function updateEventSettings(eventId: string, input: EventSettingsUpdate): Promise<void> {
  await eventsApi.eventsEventIdPatch({
    eventId,
    updateEventRequest: {
      name: input.name,
      timezone: input.timezone,
      defaultSettlementAlgorithm: toApiAlgorithm(input.settlementAlgorithm)
    }
  });
}

export async function addEventPerson(eventId: string, displayName: string): Promise<EventPerson> {
  const response = await peopleApi.eventsEventIdPeoplePost({
    eventId,
    createPersonRequest: {
      displayName
    }
  });

  return {
    id: response.person.id,
    displayName: response.person.displayName,
    linkedAccountId: response.person.linkedAccountId ?? null
  };
}

export async function createEntry(input: CreateEntryInput): Promise<EventEntry> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("You need to sign in again before adding an entry.");
  }

  const response = await fetch(`${apiBasePath}/events/${input.eventId}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      type: input.type,
      name: input.name,
      amount: input.amount,
      currency: input.currency,
      payerPersonId: input.payerPersonId,
      occurredAtUtc: input.occurredAtUtc,
      note: input.note?.trim() ? input.note.trim() : null,
      participants: input.participants.map((participant) => ({
        personId: participant.personId,
        splitMode: participant.splitMode,
        splitPercent: participant.splitPercent,
        splitAmount: participant.splitAmount
      }))
    })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Could not add this entry yet.");
  }

  const payload = (await response.json()) as EntryResponse;
  return mapEventEntry(payload.entry ?? {});
}

export async function renameEventPerson(
  eventId: string,
  personId: string,
  displayName: string
): Promise<void> {
  await peopleApi.eventsEventIdPeoplePersonIdPatch({
    eventId,
    personId,
    updatePersonRequest: {
      displayName
    }
  });
}

export async function apiErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (!(error instanceof ResponseError)) {
    return fallback;
  }

  const payload = (await error.response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? fallback;
}

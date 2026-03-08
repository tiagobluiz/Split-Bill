export type SplitMode = "even" | "shares" | "percent";

export type ParticipantFormValue = {
  id: string;
  name: string;
};

export type AllocationFormValue = {
  participantId: string;
  evenIncluded: boolean;
  shares: string;
  percent: string;
};

export type ItemFormValue = {
  id: string;
  name: string;
  price: string;
  splitMode: SplitMode;
  allocations: AllocationFormValue[];
};

export type SplitFormValues = {
  currency: string;
  participants: ParticipantFormValue[];
  payerParticipantId: string;
  items: ItemFormValue[];
};

export type StepValidationError = {
  path: string;
  message: string;
};

export type ParsedParticipant = {
  id: string;
  name: string;
  isPayer: boolean;
};

export type ParsedItemShare = {
  participantId: string;
  amountCents: number;
};

export type ParsedItem = {
  id: string;
  name: string;
  amountCents: number;
  splitMode: SplitMode;
  shares: ParsedItemShare[];
};

export type ParsedSplit = {
  currency: string;
  participants: ParsedParticipant[];
  items: ParsedItem[];
};

export type PersonSummary = {
  participantId: string;
  name: string;
  consumedCents: number;
  paidCents: number;
  netCents: number;
  isPayer: boolean;
};

export type Transfer = {
  fromParticipantId: string;
  fromName: string;
  toParticipantId: string;
  toName: string;
  amountCents: number;
};

export type SettlementResult = {
  currency: string;
  itemBreakdown: ParsedItem[];
  people: PersonSummary[];
  transfers: Transfer[];
  totalCents: number;
};

const REGION_TO_CURRENCY: Record<string, string> = {
  AT: "EUR",
  AU: "AUD",
  BE: "EUR",
  BR: "BRL",
  CA: "CAD",
  CH: "CHF",
  CZ: "CZK",
  DE: "EUR",
  DK: "DKK",
  ES: "EUR",
  FI: "EUR",
  FR: "EUR",
  GB: "GBP",
  GR: "EUR",
  IE: "EUR",
  IT: "EUR",
  JP: "JPY",
  NL: "EUR",
  NO: "NOK",
  NZ: "NZD",
  PL: "PLN",
  PT: "EUR",
  RO: "RON",
  SE: "SEK",
  US: "USD"
};

export const STORAGE_KEY = "split-bill:main-spa:draft";

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

export function detectCurrency(locale = navigator.language) {
  const region = locale.split("-")[1]?.toUpperCase();
  return (region && REGION_TO_CURRENCY[region]) || "EUR";
}

export function createAllocation(participantId: string): AllocationFormValue {
  return {
    participantId,
    evenIncluded: true,
    shares: "1",
    percent: "0"
  };
}

export function createEmptyItem(participants: ParticipantFormValue[]): ItemFormValue {
  const allocations = participants.map((participant) => createAllocation(participant.id));
  const participantCount = participants.length;
  const defaultPercent =
    participantCount > 0 ? (100 / participantCount).toFixed(2).replace(/\.00$/, "") : "0";

  return {
    id: createId(),
    name: "",
    price: "",
    splitMode: "even",
    allocations: allocations.map((allocation) => ({
      ...allocation,
      percent: defaultPercent
    }))
  };
}

export function createDefaultValues(locale?: string): SplitFormValues {
  return {
    currency: detectCurrency(locale),
    participants: [],
    payerParticipantId: "",
    items: []
  };
}

export function syncItemAllocations(
  items: ItemFormValue[],
  participants: ParticipantFormValue[]
) {
  const participantIds = new Set(participants.map((participant) => participant.id));
  const participantCount = participants.length;
  const defaultPercent =
    participantCount > 0 ? (100 / participantCount).toFixed(2).replace(/\.00$/, "") : "0";

  return items.map((item) => {
    const allocationByParticipant = new Map(
      item.allocations.map((allocation) => [allocation.participantId, allocation])
    );

    return {
      ...item,
      allocations: participants.map((participant) => {
        const existing = allocationByParticipant.get(participant.id);

        if (existing) {
          return existing;
        }

        return {
          participantId: participant.id,
          evenIncluded: true,
          shares: "1",
          percent: defaultPercent
        };
      }).filter((allocation) => participantIds.has(allocation.participantId))
    };
  });
}

function trimName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function parseMoneyToCents(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) {
    return null;
  }

  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const numericValue = Number(normalized);
  if (Number.isNaN(numericValue)) {
    return null;
  }

  return Math.round(numericValue * 100);
}

function parseDecimal(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) {
    return null;
  }

  const numericValue = Number(normalized);
  if (Number.isNaN(numericValue)) {
    return null;
  }

  return numericValue;
}

function weightOrderIndex(participantId: string, participants: ParsedParticipant[]) {
  return participants.findIndex((participant) => participant.id === participantId);
}

function allocateByWeights(
  amountCents: number,
  weights: Array<{ participantId: string; weight: number }>,
  participants: ParsedParticipant[]
) {
  const absoluteAmount = Math.abs(amountCents);
  const weightedParticipants = weights.filter((entry) => entry.weight > 0);
  const totalWeight = weightedParticipants.reduce((sum, entry) => sum + entry.weight, 0);

  if (weightedParticipants.length === 0 || totalWeight <= 0) {
    return null;
  }

  const raw = weightedParticipants.map((entry) => {
    const exact = (absoluteAmount * entry.weight) / totalWeight;
    return {
      participantId: entry.participantId,
      floor: Math.floor(exact),
      fraction: exact - Math.floor(exact)
    };
  });

  let remainder = absoluteAmount - raw.reduce((sum, entry) => sum + entry.floor, 0);

  raw.sort((left, right) => {
    const leftParticipant = participants.find((participant) => participant.id === left.participantId);
    const rightParticipant = participants.find((participant) => participant.id === right.participantId);
    const payerBias = Number(Boolean(leftParticipant?.isPayer)) - Number(Boolean(rightParticipant?.isPayer));

    if (payerBias !== 0) {
      return payerBias;
    }

    if (right.fraction !== left.fraction) {
      return right.fraction - left.fraction;
    }

    return (
      weightOrderIndex(left.participantId, participants) -
      weightOrderIndex(right.participantId, participants)
    );
  });

  const allocated = new Map<string, number>();
  raw.forEach((entry) => {
    allocated.set(entry.participantId, entry.floor);
  });

  let cursor = 0;
  while (remainder > 0 && raw.length > 0) {
    const entry = raw[cursor % raw.length];
    allocated.set(entry.participantId, (allocated.get(entry.participantId) ?? 0) + 1);
    remainder -= 1;
    cursor += 1;
  }

  return weights.map((entry) => ({
    participantId: entry.participantId,
    amountCents: (allocated.get(entry.participantId) ?? 0) * Math.sign(amountCents || 1)
  }));
}

function allocationsForItem(item: ItemFormValue) {
  if (item.splitMode === "even") {
    return item.allocations.map((allocation) => ({
      participantId: allocation.participantId,
      weight: allocation.evenIncluded ? 1 : 0
    }));
  }

  if (item.splitMode === "shares") {
    return item.allocations.map((allocation) => ({
      participantId: allocation.participantId,
      weight: parseDecimal(allocation.shares) ?? 0
    }));
  }

  return item.allocations.map((allocation) => ({
    participantId: allocation.participantId,
    weight: parseDecimal(allocation.percent) ?? 0
  }));
}

export function validateStepOne(values: SplitFormValues): StepValidationError[] {
  const errors: StepValidationError[] = [];
  const normalizedNames = values.participants.map((participant) => trimName(participant.name));
  const duplicates = new Set<string>();

  normalizedNames.forEach((name, index) => {
    if (!name) {
      errors.push({
        path: `participants.${index}.name`,
        message: "Add a name for each participant."
      });
      return;
    }

    const normalized = name.toLowerCase();
    if (duplicates.has(normalized)) {
      errors.push({
        path: `participants.${index}.name`,
        message: "Participant names must be unique."
      });
      return;
    }

    duplicates.add(normalized);
  });

  if (values.participants.length < 2) {
    errors.push({
      path: "participants",
      message: "Add at least two participants, including the payer."
    });
  }

  if (!values.payerParticipantId) {
    errors.push({
      path: "payerParticipantId",
      message: "Choose who paid the receipt."
    });
  } else if (!values.participants.some((participant) => participant.id === values.payerParticipantId)) {
    errors.push({
      path: "payerParticipantId",
      message: "The selected payer must be one of the participants."
    });
  }

  return errors;
}

export function validateStepTwo(values: SplitFormValues): StepValidationError[] {
  const errors: StepValidationError[] = [];

  if (values.items.length === 0) {
    errors.push({
      path: "items",
      message: "Add at least one item before continuing."
    });
  }

  values.items.forEach((item, index) => {
    if (!item.name.trim()) {
      errors.push({
        path: `items.${index}.name`,
        message: "Add an item name."
      });
    }

    const parsedAmount = parseMoneyToCents(item.price);
    if (parsedAmount === null || parsedAmount === 0) {
      errors.push({
        path: `items.${index}.price`,
        message: "Enter a valid amount different from zero."
      });
    }
  });

  return errors;
}

export function validateStepThree(values: SplitFormValues): StepValidationError[] {
  const errors: StepValidationError[] = [];

  values.items.forEach((item, itemIndex) => {
    if (item.splitMode === "even") {
      const included = item.allocations.filter((allocation) => allocation.evenIncluded);
      if (included.length === 0) {
        errors.push({
          path: `items.${itemIndex}.allocations`,
          message: "Choose at least one participant for an even split."
        });
      }
      return;
    }

    if (item.splitMode === "shares") {
      const totalShares = item.allocations.reduce(
        (sum, allocation) => sum + (parseDecimal(allocation.shares) ?? 0),
        0
      );

      if (totalShares <= 0) {
        errors.push({
          path: `items.${itemIndex}.allocations`,
          message: "Total shares must be greater than zero."
        });
      }

      item.allocations.forEach((allocation, allocationIndex) => {
        const shares = parseDecimal(allocation.shares);
        if (shares === null || shares < 0) {
          errors.push({
            path: `items.${itemIndex}.allocations.${allocationIndex}.shares`,
            message: "Shares must be zero or more."
          });
        }
      });

      return;
    }

    const totalPercent = item.allocations.reduce(
      (sum, allocation) => sum + (parseDecimal(allocation.percent) ?? 0),
      0
    );

    item.allocations.forEach((allocation, allocationIndex) => {
      const percent = parseDecimal(allocation.percent);
      if (percent === null || percent < 0) {
        errors.push({
          path: `items.${itemIndex}.allocations.${allocationIndex}.percent`,
          message: "Percent must be zero or more."
        });
      }
    });

    if (Math.abs(totalPercent - 100) > 0.001) {
      errors.push({
        path: `items.${itemIndex}.allocations`,
        message: "Percent totals must add up to 100."
      });
    }
  });

  return errors;
}

export function parseSplit(values: SplitFormValues) {
  const stepErrors = [
    ...validateStepOne(values),
    ...validateStepTwo(values),
    ...validateStepThree(values)
  ];

  if (stepErrors.length > 0) {
    return { ok: false as const, errors: stepErrors };
  }

  const participants = values.participants.map((participant) => ({
    id: participant.id,
    name: trimName(participant.name),
    isPayer: participant.id === values.payerParticipantId
  }));

  const items = values.items.map((item) => {
    const amountCents = parseMoneyToCents(item.price) ?? 0;
    const weights = allocationsForItem(item);
    const shares = allocateByWeights(amountCents, weights, participants);

    return {
      id: item.id,
      name: trimName(item.name),
      amountCents,
      splitMode: item.splitMode,
      shares: shares ?? []
    };
  });

  return {
    ok: true as const,
    data: {
      currency: values.currency,
      participants,
      items
    }
  };
}

export function computeSettlement(values: SplitFormValues) {
  const parsed = parseSplit(values);

  if (!parsed.ok) {
    return parsed;
  }

  const totalCents = parsed.data.items.reduce((sum, item) => sum + item.amountCents, 0);
  const payer = parsed.data.participants.find((participant) => participant.isPayer);

  if (!payer) {
    return {
      ok: false as const,
      errors: [
        {
          path: "payerParticipantId",
          message: "Choose who paid the receipt."
        }
      ]
    };
  }

  const people = parsed.data.participants.map((participant) => {
    const consumedCents = parsed.data.items.reduce((sum, item) => {
      const share = item.shares.find((entry) => entry.participantId === participant.id);
      return sum + (share?.amountCents ?? 0);
    }, 0);
    const paidCents = participant.isPayer ? totalCents : 0;

    return {
      participantId: participant.id,
      name: participant.name,
      consumedCents,
      paidCents,
      netCents: paidCents - consumedCents,
      isPayer: participant.isPayer
    };
  });

  const transfers = people
    .filter((person) => !person.isPayer && person.netCents < 0)
    .map((person) => ({
      fromParticipantId: person.participantId,
      fromName: person.name,
      toParticipantId: payer.id,
      toName: payer.name,
      amountCents: Math.abs(person.netCents)
    }))
    .filter((transfer) => transfer.amountCents > 0);

  return {
    ok: true as const,
    data: {
      currency: parsed.data.currency,
      itemBreakdown: parsed.data.items,
      people,
      transfers,
      totalCents
    } satisfies SettlementResult
  };
}

export function formatMoney(amountCents: number, currency: string, locale = navigator.language) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountCents / 100);
}

export function buildShareSummary(item: ParsedItem, participants: ParsedParticipant[], currency: string) {
  return item.shares
    .map((share) => {
      const participant = participants.find((entry) => entry.id === share.participantId);
      return `${participant?.name ?? "Unknown"} ${formatMoney(share.amountCents, currency)}`;
    })
    .join(" • ");
}

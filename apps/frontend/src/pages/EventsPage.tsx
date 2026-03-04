import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { z } from "zod";
import { PageZone } from "../layout/AppShell";

const eventFormSchema = z.object({
  eventName: z.string().trim().min(1, "Event name is required"),
  baseCurrency: z.string().trim().min(1, "Base currency is required"),
  timezone: z.string().trim().min(1, "Timezone is required"),
  settlementAlgorithm: z.enum(["min-transfer", "pairwise"]),
  description: z.string().trim().max(300, "Description can be up to 300 characters").optional()
});

type EventFormValues = z.infer<typeof eventFormSchema>;

type EventItem = {
  id: string;
  name: string;
  baseCurrency: string;
  timezone: string;
  settlementAlgorithm: "min-transfer" | "pairwise";
  participants: string[];
  defaultCategories: string[];
  customCategories: string[];
  updatedAt: string;
  status: "active" | "archived";
};

const DEFAULT_CATEGORIES = ["Food", "Transport", "Lodging"];

const INITIAL_EVENTS: EventItem[] = [
  {
    id: "evt-1",
    name: "Spring Trip 2026",
    baseCurrency: "EUR",
    timezone: "Europe/Paris",
    settlementAlgorithm: "min-transfer",
    participants: ["Ana", "Bruno", "Carla"],
    defaultCategories: DEFAULT_CATEGORIES,
    customCategories: ["Activities"],
    updatedAt: "2026-03-01",
    status: "active"
  }
];

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [selectedEventId, setSelectedEventId] = useState<string>(INITIAL_EVENTS[0]?.id ?? "");
  const [participantInput, setParticipantInput] = useState("");
  const [draftParticipants, setDraftParticipants] = useState<string[]>([]);
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | "EUR" | "USD">("all");
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    mode: "onBlur",
    defaultValues: {
      eventName: "",
      baseCurrency: "EUR",
      timezone: "Europe/Paris",
      settlementAlgorithm: "min-transfer",
      description: ""
    }
  });

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const searchMatches =
          searchTerm.trim().length === 0 ||
          event.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
        const statusMatches = statusFilter === "all" || event.status === statusFilter;
        const currencyMatches = currencyFilter === "all" || event.baseCurrency === currencyFilter;
        return searchMatches && statusMatches && currencyMatches;
      }),
    [currencyFilter, events, searchTerm, statusFilter]
  );

  const addDraftParticipant = () => {
    const normalized = participantInput.trim();
    if (!normalized) {
      setParticipantError("Add at least one person to continue.");
      return;
    }

    const hasDuplicate = draftParticipants.some(
      (entry) => entry.toLowerCase() === normalized.toLowerCase()
    );
    if (hasDuplicate) {
      setParticipantError("This person is already added");
      return;
    }

    setParticipantError(null);
    setDraftParticipants((current) => [...current, normalized]);
    setParticipantInput("");
  };

  const updateSelectedEvent = (updater: (event: EventItem) => EventItem) => {
    setEvents((current) => current.map((event) => (event.id === selectedEventId ? updater(event) : event)));
  };

  const addCustomCategory = () => {
    if (!selectedEvent) {
      return;
    }

    const normalized = customCategoryInput.trim();
    if (!normalized) {
      setCategoryError("Category name is required.");
      return;
    }

    const hasDuplicate = [...selectedEvent.defaultCategories, ...selectedEvent.customCategories].some(
      (category) => category.toLowerCase() === normalized.toLowerCase()
    );
    if (hasDuplicate) {
      setCategoryError("This category is already available.");
      return;
    }

    setCategoryError(null);
    updateSelectedEvent((event) => ({
      ...event,
      customCategories: [...event.customCategories, normalized],
      updatedAt: "2026-03-04"
    }));
    setCustomCategoryInput("");
  };

  const onSubmit = async (values: EventFormValues) => {
    setSubmitSuccess(null);
    if (draftParticipants.length === 0) {
      setParticipantError("Add at least one person to continue.");
      return;
    }

    const normalizedName = values.eventName.trim();
    const duplicateEvent = events.some((event) => event.name.toLowerCase() === normalizedName.toLowerCase());
    if (duplicateEvent) {
      setSubmitSuccess(null);
      return;
    }

    const newEvent: EventItem = {
      id: `evt-${Date.now()}`,
      name: normalizedName,
      baseCurrency: values.baseCurrency,
      timezone: values.timezone,
      settlementAlgorithm: values.settlementAlgorithm,
      participants: draftParticipants,
      defaultCategories: DEFAULT_CATEGORIES,
      customCategories: [],
      updatedAt: "2026-03-04",
      status: "active"
    };

    await Promise.resolve();
    setEvents((current) => [newEvent, ...current]);
    setSelectedEventId(newEvent.id);
    setSubmitSuccess(`Event "${newEvent.name}" created.`);
    setDraftParticipants([]);
    setParticipantInput("");
    reset({
      eventName: "",
      baseCurrency: values.baseCurrency,
      timezone: values.timezone,
      settlementAlgorithm: values.settlementAlgorithm,
      description: ""
    });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Event setup
        </Typography>
        <Typography color="text.secondary">
          Create events, manage people, and maintain categories before adding entries.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: { xs: "stretch", md: "flex-end" } }}>
        <Button
          type="submit"
          form="create-event-form"
          variant="contained"
          sx={{ minHeight: 44 }}
          startIcon={<AddRoundedIcon />}
          disabled={isSubmitting}
        >
          Create event
        </Button>
      </Box>

      <PageZone title="Filters">
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            label="Search events"
            placeholder="Search events"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            fullWidth
          />
          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel id="events-status-filter-label">Status</InputLabel>
            <Select
              labelId="events-status-filter-label"
              label="Status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | "active" | "archived")
              }
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel id="events-currency-filter-label">Currency</InputLabel>
            <Select
              labelId="events-currency-filter-label"
              label="Currency"
              value={currencyFilter}
              onChange={(event) => setCurrencyFilter(event.target.value as "all" | "EUR" | "USD")}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </PageZone>

      <PageZone title="Primary content">
        <Stack spacing={3}>
          {submitSuccess ? <Alert severity="success">{submitSuccess}</Alert> : null}

          <Box
            id="create-event-form"
            component="form"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              p: { xs: 2, md: 2.5 },
              border: "1px solid #F3E4DA",
              borderRadius: 3,
              bgcolor: "#FFF1E7"
            }}
          >
            <Stack spacing={2}>
              <Typography variant="h6" component="h2">
                Create event
              </Typography>
              <Controller
                name="eventName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Event name"
                    placeholder="Summer Trip 2026"
                    error={Boolean(errors.eventName)}
                    helperText={errors.eventName?.message}
                  />
                )}
              />
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <Controller
                  name="baseCurrency"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={Boolean(errors.baseCurrency)}>
                      <InputLabel id="event-currency-label">Base currency</InputLabel>
                      <Select {...field} labelId="event-currency-label" label="Base currency">
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="USD">USD</MenuItem>
                      </Select>
                      <FormHelperText>{errors.baseCurrency?.message}</FormHelperText>
                    </FormControl>
                  )}
                />
                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={Boolean(errors.timezone)}>
                      <InputLabel id="event-timezone-label">Timezone</InputLabel>
                      <Select {...field} labelId="event-timezone-label" label="Timezone">
                        <MenuItem value="Europe/Paris">Europe/Paris</MenuItem>
                        <MenuItem value="Europe/Lisbon">Europe/Lisbon</MenuItem>
                      </Select>
                      <FormHelperText>{errors.timezone?.message}</FormHelperText>
                    </FormControl>
                  )}
                />
              </Stack>
              <Controller
                name="settlementAlgorithm"
                control={control}
                render={({ field }) => (
                  <FormControl error={Boolean(errors.settlementAlgorithm)}>
                    <InputLabel id="event-settlement-label">Default settlement algorithm</InputLabel>
                    <Select
                      {...field}
                      labelId="event-settlement-label"
                      label="Default settlement algorithm"
                    >
                      <MenuItem value="min-transfer">Min transfer</MenuItem>
                      <MenuItem value="pairwise">Pairwise</MenuItem>
                    </Select>
                    <FormHelperText>{errors.settlementAlgorithm?.message}</FormHelperText>
                  </FormControl>
                )}
              />
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    multiline
                    minRows={3}
                    label="Description (optional)"
                    placeholder="A quick context for this event"
                    error={Boolean(errors.description)}
                    helperText={errors.description?.message ?? "Optional context for collaborators."}
                  />
                )}
              />
              <Stack spacing={1}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Participants
                </Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "flex-start" }}>
                  <TextField
                    label="Add person"
                    placeholder="Name"
                    value={participantInput}
                    onChange={(event) => setParticipantInput(event.target.value)}
                    error={Boolean(participantError)}
                    helperText={participantError ?? "People become available in split forms."}
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    startIcon={<AddRoundedIcon />}
                    sx={{ minHeight: 44 }}
                    onClick={addDraftParticipant}
                  >
                    Add person
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {draftParticipants.map((person) => (
                    <Chip
                      key={person}
                      label={person}
                      onDelete={() =>
                        setDraftParticipants((current) => current.filter((entry) => entry !== person))
                      }
                    />
                  ))}
                </Stack>
              </Stack>
            </Stack>
          </Box>

          <Stack spacing={1.5}>
            <Typography variant="h6" component="h2">
              Your events
            </Typography>
            <Stack spacing={1.5}>
              {filteredEvents.map((event) => {
                const selected = event.id === selectedEventId;
                return (
                  <Box
                    key={event.id}
                    sx={{
                      border: "1px solid #E7D7CC",
                      borderRadius: 2,
                      p: 2,
                      bgcolor: selected ? "#FFF1E7" : "#FFFFFF"
                    }}
                  >
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                      <Box>
                        <Typography variant="h6">{event.name}</Typography>
                        <Typography color="text.secondary">
                          {event.baseCurrency} • {event.timezone} • {event.participants.length} people
                        </Typography>
                      </Box>
                      <Button
                        variant={selected ? "contained" : "outlined"}
                        sx={{ minHeight: 40 }}
                        onClick={() => setSelectedEventId(event.id)}
                      >
                        {selected ? "Selected" : "Open"}
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Stack>
        </Stack>
      </PageZone>

      <PageZone title="Secondary content">
        {selectedEvent ? (
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h6">People</Typography>
              <Typography color="text.secondary">
                Manage who can be mapped in this event workspace.
              </Typography>
            </Box>
            <Stack spacing={1}>
              {selectedEvent.participants.map((person) => (
                <Box
                  key={person}
                  sx={{
                    border: "1px solid #E7D7CC",
                    borderRadius: 2,
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <Box>
                    <Typography fontWeight={600}>{person}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Linked account: Not linked
                    </Typography>
                  </Box>
                  <IconButton
                    aria-label={`Remove ${person}`}
                    onClick={() =>
                      updateSelectedEvent((event) => ({
                        ...event,
                        participants: event.participants.filter((entry) => entry !== person),
                        updatedAt: "2026-03-04"
                      }))
                    }
                  >
                    <DeleteOutlineRoundedIcon />
                  </IconButton>
                </Box>
              ))}
            </Stack>

            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Categories
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                Changes here affect entry forms and analytics grouping.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                {selectedEvent.defaultCategories.map((category) => (
                  <Chip key={category} label={category} color="secondary" variant="outlined" />
                ))}
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "flex-start" }}>
                <TextField
                  label="Add category"
                  placeholder="Snacks"
                  value={customCategoryInput}
                  onChange={(event) => setCustomCategoryInput(event.target.value)}
                  error={Boolean(categoryError)}
                  helperText={categoryError ?? "Add custom categories for this event."}
                  fullWidth
                />
                <Button variant="outlined" onClick={addCustomCategory} sx={{ minHeight: 44 }}>
                  Add category
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                {selectedEvent.customCategories.length === 0 ? (
                  <Typography color="text.secondary">No custom categories yet.</Typography>
                ) : (
                  selectedEvent.customCategories.map((category) => (
                    <Stack
                      key={category}
                      direction="row"
                      alignItems="center"
                      spacing={0.5}
                      sx={{ border: "1px solid #E7D7CC", borderRadius: 999, pr: 0.5 }}
                    >
                      <Chip label={category} sx={{ borderRadius: 999 }} />
                      <IconButton
                        size="small"
                        aria-label={`Remove category ${category}`}
                        onClick={() =>
                          updateSelectedEvent((event) => ({
                            ...event,
                            customCategories: event.customCategories.filter((entry) => entry !== category),
                            updatedAt: "2026-03-04"
                          }))
                        }
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))
                )}
              </Stack>
            </Box>
          </Stack>
        ) : (
          <Alert severity="info">Select an event to manage people and categories.</Alert>
        )}
      </PageZone>

      <PageZone title="Feedback states">
        {filteredEvents.length === 0 ? (
          <Alert severity="info">No events match your filters yet.</Alert>
        ) : (
          <Typography color="text.secondary">
            {filteredEvents.length} event{filteredEvents.length > 1 ? "s" : ""} available.
          </Typography>
        )}
      </PageZone>
    </Stack>
  );
}

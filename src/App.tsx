import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import { startTransition, useEffect, useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  buildShareSummary,
  computeSettlement,
  createDefaultValues,
  createEmptyItem,
  createId,
  formatMoney,
  syncItemAllocations,
  type AllocationFormValue,
  type ParticipantFormValue,
  type SplitFormValues,
  type SplitMode,
  validateStepOne,
  validateStepThree,
  validateStepTwo
} from "./domain/splitter";
import { clearStoredDraft, loadStoredDraft, storeDraft } from "./storage";

const STEP_LABELS = [
  "People & payer",
  "Items",
  "Consumption grid",
  "Results"
] as const;

function SortableCard(props: {
  id: string;
  children: ReactNode;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.id
  });

  return (
    <Card
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        overflow: "visible"
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder item"
              size="small"
              sx={{
                bgcolor: alpha("#EF5B3C", 0.08),
                "&:hover": { bgcolor: alpha("#EF5B3C", 0.14) }
              }}
            >
              <DragIndicatorRoundedIcon fontSize="small" />
            </IconButton>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Move up">
                <span>
                  <IconButton
                    onClick={props.onMoveUp}
                    disabled={props.disableMoveUp}
                    size="small"
                    aria-label="Move item up"
                  >
                    <KeyboardArrowUpRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move down">
                <span>
                  <IconButton
                    onClick={props.onMoveDown}
                    disabled={props.disableMoveDown}
                    size="small"
                    aria-label="Move item down"
                  >
                    <KeyboardArrowDownRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </Stack>
        <Box sx={{ mt: 2 }}>{props.children}</Box>
      </CardContent>
    </Card>
  );
}

function App() {
  const storedDraft = loadStoredDraft();
  const [activeStep, setActiveStep] = useState(0);
  const [participantInput, setParticipantInput] = useState("");
  const [showRestoreDialog, setShowRestoreDialog] = useState(Boolean(storedDraft));
  const [saveNoticeOpen, setSaveNoticeOpen] = useState(false);
  const [copyNoticeOpen, setCopyNoticeOpen] = useState(false);

  const {
    control,
    clearErrors,
    formState: { errors },
    getValues,
    register,
    reset,
    setError,
    setValue
  } = useForm<SplitFormValues>({
    defaultValues: createDefaultValues()
  });

  const participantsArray = useFieldArray({
    control,
    name: "participants",
    keyName: "fieldKey"
  });

  const itemsArray = useFieldArray({
    control,
    name: "items",
    keyName: "fieldKey"
  });

  const watchedValues = useWatch({ control }) as SplitFormValues;
  const participants = (useWatch({ control, name: "participants" }) ?? []) as ParticipantFormValue[];
  const items = (useWatch({ control, name: "items" }) ?? []) as SplitFormValues["items"];
  const payerParticipantId = (useWatch({ control, name: "payerParticipantId" }) ?? "") as string;
  const currency = (useWatch({ control, name: "currency" }) ?? "EUR") as string;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (showRestoreDialog) {
      return;
    }

    storeDraft({
      step: activeStep,
      values: watchedValues
    });
  }, [activeStep, showRestoreDialog, watchedValues]);

  function applyStepErrors(stepErrors: Array<{ path: string; message: string }>) {
    stepErrors.forEach((error) => {
      setError(error.path as never, {
        type: "manual",
        message: error.message
      });
    });
  }

  function validateCurrentStep() {
    clearErrors();

    if (activeStep === 0) {
      const stepErrors = validateStepOne(getValues());
      applyStepErrors(stepErrors);
      return stepErrors.length === 0;
    }

    if (activeStep === 1) {
      const stepErrors = validateStepTwo(getValues());
      applyStepErrors(stepErrors);
      return stepErrors.length === 0;
    }

    if (activeStep === 2) {
      const stepErrors = validateStepThree(getValues());
      applyStepErrors(stepErrors);
      return stepErrors.length === 0;
    }

    return true;
  }

  function handleNext() {
    if (!validateCurrentStep()) {
      return;
    }

    startTransition(() => {
      setActiveStep((currentStep) => Math.min(currentStep + 1, STEP_LABELS.length - 1));
    });
  }

  function handleBack() {
    startTransition(() => {
      setActiveStep((currentStep) => Math.max(currentStep - 1, 0));
    });
  }

  function addParticipant() {
    const nextName = participantInput.trim().replace(/\s+/g, " ");
    if (!nextName) {
      return;
    }

    const nextParticipant: ParticipantFormValue = {
      id: createId(),
      name: nextName
    };
    const nextParticipants = [...getValues("participants"), nextParticipant];
    participantsArray.append(nextParticipant);
    setValue("items", syncItemAllocations(getValues("items"), nextParticipants));
    if (!getValues("payerParticipantId")) {
      setValue("payerParticipantId", nextParticipant.id);
    }
    setParticipantInput("");
  }

  function removeParticipant(index: number) {
    const currentParticipants = getValues("participants");
    const participantToRemove = currentParticipants[index];
    const nextParticipants = currentParticipants.filter((_, currentIndex) => currentIndex !== index);

    participantsArray.remove(index);
    setValue("items", syncItemAllocations(getValues("items"), nextParticipants));

    if (participantToRemove?.id === getValues("payerParticipantId")) {
      setValue("payerParticipantId", nextParticipants[0]?.id ?? "");
    }
  }

  function addItem() {
    itemsArray.append(createEmptyItem(getValues("participants")));
  }

  function removeItem(index: number) {
    itemsArray.remove(index);
  }

  function reorderItems(oldIndex: number, newIndex: number) {
    if (oldIndex === newIndex || newIndex < 0 || newIndex >= items.length) {
      return;
    }

    itemsArray.move(oldIndex, newIndex);
  }

  function handleItemDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === event.active.id);
    const newIndex = items.findIndex((item) => item.id === event.over?.id);

    if (oldIndex >= 0 && newIndex >= 0) {
      reorderItems(oldIndex, newIndex);
    }
  }

  function restoreDraft() {
    if (!storedDraft) {
      setShowRestoreDialog(false);
      return;
    }

    reset(storedDraft.values);
    setActiveStep(storedDraft.step);
    setShowRestoreDialog(false);
    setSaveNoticeOpen(true);
  }

  function discardDraft() {
    clearStoredDraft();
    reset(createDefaultValues());
    setActiveStep(0);
    setShowRestoreDialog(false);
  }

  function startOver() {
    clearStoredDraft();
    reset(createDefaultValues());
    setActiveStep(0);
  }

  async function copySummary() {
    const settlement = computeSettlement(getValues());
    if (!settlement.ok) {
      return;
    }

    const lines = settlement.data.transfers.length
      ? settlement.data.transfers.map(
          (transfer) =>
            `${transfer.fromName} pays ${transfer.toName} ${formatMoney(transfer.amountCents, settlement.data.currency)}`
        )
      : ["Everyone is settled."];

    const summary = [
      "Split-Bill summary",
      ...lines,
      "",
      ...settlement.data.people.map(
        (person) =>
          `${person.name}: consumed ${formatMoney(person.consumedCents, settlement.data.currency)}, paid ${formatMoney(person.paidCents, settlement.data.currency)}, net ${formatMoney(person.netCents, settlement.data.currency)}`
      )
    ].join("\n");

    await navigator.clipboard.writeText(summary);
    setCopyNoticeOpen(true);
  }

  const settlement = computeSettlement(watchedValues);
  const payer = participants.find((participant) => participant.id === payerParticipantId);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(circle at top left, rgba(239,91,60,0.18), transparent 30%), radial-gradient(circle at right 20%, rgba(15,118,110,0.18), transparent 25%), linear-gradient(180deg, #FFF8F2 0%, #FFFDFC 72%)"
      }}
    >
      <Box sx={{ maxWidth: 1240, mx: "auto", px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>
        <Stack spacing={4}>
          <Card
            sx={{
              overflow: "hidden",
              background:
                "linear-gradient(135deg, rgba(239,91,60,0.95), rgba(246,151,59,0.95) 58%, rgba(15,118,110,0.92))",
              color: "white"
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <Grid container spacing={3} alignItems="center">
                <Grid size={{ xs: 12, md: 7 }}>
                  <Stack spacing={2.5}>
                    <Chip
                      label="Supermarket receipt splitter"
                      icon={<ReceiptLongRoundedIcon sx={{ color: "white !important" }} />}
                      sx={{
                        alignSelf: "flex-start",
                        bgcolor: alpha("#FFFFFF", 0.16),
                        color: "white",
                        fontWeight: 700
                      }}
                    />
                    <Typography variant="h1">
                      Split one grocery bill without the spreadsheet drama.
                    </Typography>
                    <Typography sx={{ maxWidth: 640, fontSize: { xs: "1rem", md: "1.15rem" }, opacity: 0.9 }}>
                      Add the people, mark who paid, drop in each product, and fine-tune who consumed what.
                      The payer stays visible the whole way and the result is ready to copy.
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                      <Button
                        variant="contained"
                        size="large"
                        endIcon={<ArrowForwardRoundedIcon />}
                        onClick={() => {
                          const wizard = document.getElementById("splitter-wizard");
                          wizard?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        sx={{
                          bgcolor: "white",
                          color: "#C64024",
                          "&:hover": { bgcolor: alpha("#FFFFFF", 0.92) }
                        }}
                      >
                        Start splitting
                      </Button>
                      <Chip
                        label={`Currency ${currency || "EUR"}`}
                        sx={{
                          alignSelf: { xs: "stretch", sm: "center" },
                          bgcolor: alpha("#FFFFFF", 0.16),
                          color: "white"
                        }}
                      />
                    </Stack>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Card
                    sx={{
                      bgcolor: alpha("#0F172A", 0.2),
                      borderColor: alpha("#FFFFFF", 0.2)
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h3" sx={{ color: "white" }}>
                            Quick flow
                          </Typography>
                          <PaidRoundedIcon />
                        </Stack>
                        {[
                          "1. Add at least two people and choose the payer.",
                          "2. Add every product line and reorder freely.",
                          "3. Adjust who consumed each item.",
                          "4. Copy the reimbursement summary."
                        ].map((line) => (
                          <Alert
                            key={line}
                            icon={false}
                            sx={{
                              bgcolor: alpha("#FFFFFF", 0.12),
                              color: "white",
                              "& .MuiAlert-message": { width: "100%" }
                            }}
                          >
                            {line}
                          </Alert>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card id="splitter-wizard">
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack spacing={3}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                  <Box>
                    <Typography variant="h2">Receipt splitter</Typography>
                    <Typography color="text.secondary">
                      Fast setup, item-level control, and one clean settlement at the end.
                    </Typography>
                  </Box>
                  <TextField
                    label="Currency"
                    size="small"
                    value={currency}
                    onChange={(event) => setValue("currency", event.target.value.toUpperCase())}
                    sx={{ width: { xs: "100%", md: 180 } }}
                  />
                </Stack>

                <Grid container spacing={1.5}>
                  {STEP_LABELS.map((label, index) => {
                    const completed = activeStep > index;
                    const current = activeStep === index;

                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 3 }} key={label}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 4,
                            border: "1px solid",
                            borderColor: current
                              ? "primary.main"
                              : completed
                                ? alpha("#0F766E", 0.3)
                                : alpha("#1D1D1F", 0.08),
                            bgcolor: current
                              ? alpha("#EF5B3C", 0.08)
                              : completed
                                ? alpha("#0F766E", 0.08)
                                : "transparent"
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Step {index + 1}
                          </Typography>
                          <Typography fontWeight={800}>{label}</Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>

                <LinearProgress
                  variant="determinate"
                  value={((activeStep + 1) / STEP_LABELS.length) * 100}
                  sx={{
                    height: 10,
                    borderRadius: 999,
                    bgcolor: alpha("#EF5B3C", 0.08),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999
                    }
                  }}
                />

                {activeStep === 0 && (
                  <Stack spacing={3}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.5}
                      alignItems={{ md: "center" }}
                    >
                      <TextField
                        label="Add participant"
                        placeholder="Ana"
                        value={participantInput}
                        onChange={(event) => setParticipantInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addParticipant();
                          }
                        }}
                        fullWidth
                      />
                      <Button
                        variant="contained"
                        startIcon={<AddRoundedIcon />}
                        onClick={addParticipant}
                      >
                        Add
                      </Button>
                    </Stack>

                    {errors.participants?.message && (
                      <Alert severity="error">{errors.participants.message}</Alert>
                    )}

                    <Grid container spacing={2}>
                      {participants.map((participant, index) => {
                        const participantError = errors.participants?.[index]?.name?.message;

                        return (
                          <Grid size={{ xs: 12, md: 6 }} key={participant.id}>
                            <Card
                              sx={{
                                borderColor:
                                  payerParticipantId === participant.id
                                    ? "primary.main"
                                    : alpha("#1D1D1F", 0.08),
                                borderStyle: "solid",
                                borderWidth: 1
                              }}
                            >
                              <CardContent>
                                <Stack spacing={2}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Chip
                                        icon={<PersonRoundedIcon />}
                                        label={`Participant ${index + 1}`}
                                        variant="outlined"
                                      />
                                      {payerParticipantId === participant.id && (
                                        <Chip
                                          color="primary"
                                          icon={<PaidRoundedIcon />}
                                          label="Payer"
                                        />
                                      )}
                                    </Stack>
                                    <IconButton
                                      aria-label={`Remove ${participant.name || `participant ${index + 1}`}`}
                                      onClick={() => removeParticipant(index)}
                                    >
                                      <DeleteOutlineRoundedIcon />
                                    </IconButton>
                                  </Stack>
                                  <TextField
                                    label="Name"
                                    fullWidth
                                    {...register(`participants.${index}.name` as const)}
                                    error={Boolean(participantError)}
                                    helperText={participantError}
                                  />
                                  <Button
                                    variant={payerParticipantId === participant.id ? "contained" : "outlined"}
                                    onClick={() => setValue("payerParticipantId", participant.id)}
                                    startIcon={<PaidRoundedIcon />}
                                  >
                                    {payerParticipantId === participant.id ? "Marked as payer" : "Mark as payer"}
                                  </Button>
                                </Stack>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>

                    {errors.payerParticipantId?.message && (
                      <Alert severity="error">{errors.payerParticipantId.message}</Alert>
                    )}
                  </Stack>
                )}

                {activeStep === 1 && (
                  <Stack spacing={3}>
                    <Alert severity="info" icon={<PaidRoundedIcon />}>
                      {payer ? `${payer.name} paid the receipt.` : "Choose the payer in Step 1 before continuing."}
                    </Alert>

                    <Button
                      variant="contained"
                      startIcon={<AddRoundedIcon />}
                      onClick={addItem}
                      sx={{ alignSelf: "flex-start" }}
                    >
                      Add item
                    </Button>

                    {errors.items?.message && <Alert severity="error">{errors.items.message}</Alert>}

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragEnd={handleItemDragEnd}
                    >
                      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                        <Stack spacing={2}>
                          {items.map((item, index) => {
                            const itemNameError = errors.items?.[index]?.name?.message;
                            const itemPriceError = errors.items?.[index]?.price?.message;

                            return (
                              <SortableCard
                                key={item.id}
                                id={item.id}
                                onMoveUp={() => reorderItems(index, index - 1)}
                                onMoveDown={() => reorderItems(index, index + 1)}
                                disableMoveUp={index === 0}
                                disableMoveDown={index === items.length - 1}
                              >
                                <Grid container spacing={2}>
                                  <Grid size={{ xs: 12, md: 7 }}>
                                    <TextField
                                      label="Item name"
                                      placeholder="Tomatoes"
                                      fullWidth
                                      {...register(`items.${index}.name` as const)}
                                      error={Boolean(itemNameError)}
                                      helperText={itemNameError}
                                    />
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 4 }}>
                                    <TextField
                                      label="Price"
                                      placeholder="3.49"
                                      fullWidth
                                      {...register(`items.${index}.price` as const)}
                                      error={Boolean(itemPriceError)}
                                      helperText={itemPriceError}
                                      InputProps={{
                                        startAdornment: (
                                          <InputAdornment position="start">{currency}</InputAdornment>
                                        )
                                      }}
                                    />
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 1 }}>
                                    <IconButton
                                      aria-label={`Delete ${item.name || `item ${index + 1}`}`}
                                      onClick={() => removeItem(index)}
                                      sx={{ mt: { md: 1 } }}
                                    >
                                      <DeleteOutlineRoundedIcon />
                                    </IconButton>
                                  </Grid>
                                </Grid>
                              </SortableCard>
                            );
                          })}
                        </Stack>
                      </SortableContext>
                    </DndContext>
                  </Stack>
                )}

                {activeStep === 2 && (
                  <Stack spacing={3}>
                    <Alert severity="info" icon={<SavingsRoundedIcon />}>
                      {payer
                        ? `${payer.name} stays highlighted as the payer while you assign each item.`
                        : "Choose the payer in Step 1 before continuing."}
                    </Alert>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragEnd={handleItemDragEnd}
                    >
                      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                        <Stack spacing={2}>
                          {items.map((item, itemIndex) => {
                            const parsedItem =
                              settlement.ok && settlement.data.itemBreakdown.find((entry) => entry.id === item.id);
                            const allocationError =
                              typeof errors.items?.[itemIndex]?.allocations?.message === "string"
                                ? errors.items[itemIndex]?.allocations?.message
                                : undefined;

                            return (
                              <SortableCard
                                key={item.id}
                                id={item.id}
                                onMoveUp={() => reorderItems(itemIndex, itemIndex - 1)}
                                onMoveDown={() => reorderItems(itemIndex, itemIndex + 1)}
                                disableMoveUp={itemIndex === 0}
                                disableMoveDown={itemIndex === items.length - 1}
                              >
                                <Stack spacing={2}>
                                  <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={1.5}
                                    justifyContent="space-between"
                                  >
                                    <Box>
                                      <Typography variant="h3">{item.name || `Item ${itemIndex + 1}`}</Typography>
                                      <Typography color="text.secondary">
                                        {item.price ? `${currency} ${item.price}` : "Enter an amount in Step 2"}
                                      </Typography>
                                    </Box>
                                    <ToggleButtonGroup
                                      exclusive
                                      value={item.splitMode}
                                      onChange={(_, nextMode: SplitMode | null) => {
                                        if (nextMode) {
                                          setValue(`items.${itemIndex}.splitMode`, nextMode);
                                        }
                                      }}
                                      size="small"
                                      color="primary"
                                    >
                                      <ToggleButton value="even">Even</ToggleButton>
                                      <ToggleButton value="shares">Shares</ToggleButton>
                                      <ToggleButton value="percent">Percent</ToggleButton>
                                    </ToggleButtonGroup>
                                  </Stack>

                                  <Grid container spacing={1.5}>
                                    {participants.map((participant, allocationIndex) => {
                                      const allocation = item.allocations[allocationIndex] as
                                        | AllocationFormValue
                                        | undefined;
                                      const isPayer = payerParticipantId === participant.id;

                                      return (
                                        <Grid size={{ xs: 12, md: 6 }} key={participant.id}>
                                          <Card
                                            variant="outlined"
                                            sx={{
                                              height: "100%",
                                              borderColor: isPayer
                                                ? alpha("#EF5B3C", 0.55)
                                                : alpha("#1D1D1F", 0.08),
                                              bgcolor: isPayer ? alpha("#EF5B3C", 0.04) : "transparent"
                                            }}
                                          >
                                            <CardContent>
                                              <Stack spacing={1.5}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                  <Typography fontWeight={700}>{participant.name}</Typography>
                                                  {isPayer && <Chip label="Payer" color="primary" size="small" />}
                                                </Stack>

                                                {item.splitMode === "even" && allocation && (
                                                  <Button
                                                    variant={allocation.evenIncluded ? "contained" : "outlined"}
                                                    onClick={() =>
                                                      setValue(
                                                        `items.${itemIndex}.allocations.${allocationIndex}.evenIncluded`,
                                                        !allocation.evenIncluded
                                                      )
                                                    }
                                                  >
                                                    {allocation.evenIncluded ? "Included" : "Excluded"}
                                                  </Button>
                                                )}

                                                {item.splitMode === "shares" && (
                                                  <TextField
                                                    label="Share units"
                                                    fullWidth
                                                    {...register(
                                                      `items.${itemIndex}.allocations.${allocationIndex}.shares` as const
                                                    )}
                                                  />
                                                )}

                                                {item.splitMode === "percent" && (
                                                  <TextField
                                                    label="Percent"
                                                    fullWidth
                                                    {...register(
                                                      `items.${itemIndex}.allocations.${allocationIndex}.percent` as const
                                                    )}
                                                    InputProps={{
                                                      endAdornment: <InputAdornment position="end">%</InputAdornment>
                                                    }}
                                                  />
                                                )}
                                              </Stack>
                                            </CardContent>
                                          </Card>
                                        </Grid>
                                      );
                                    })}
                                  </Grid>

                                  {allocationError && <Alert severity="error">{allocationError}</Alert>}
                                  <Alert severity="success" icon={false}>
                                    {parsedItem
                                      ? buildShareSummary(
                                          parsedItem,
                                          settlement.ok
                                            ? settlement.data.people.map((person) => ({
                                                id: person.participantId,
                                                name: person.name,
                                                isPayer: person.isPayer
                                              }))
                                            : [],
                                          currency
                                        )
                                      : "Finish the row and the per-person preview will appear here."}
                                  </Alert>
                                </Stack>
                              </SortableCard>
                            );
                          })}
                        </Stack>
                      </SortableContext>
                    </DndContext>
                  </Stack>
                )}

                {activeStep === 3 && settlement.ok && (
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, lg: 7 }}>
                      <Card
                        sx={{
                          background:
                            "linear-gradient(135deg, rgba(15,118,110,0.08), rgba(15,118,110,0.02))"
                        }}
                      >
                        <CardContent>
                          <Stack spacing={2}>
                            <Typography variant="h2">Who should pay whom</Typography>
                            <Typography color="text.secondary">
                              Total receipt: {formatMoney(settlement.data.totalCents, settlement.data.currency)}
                            </Typography>
                            {settlement.data.transfers.length > 0 ? (
                              settlement.data.transfers.map((transfer) => (
                                <Alert key={transfer.fromParticipantId} severity="success" icon={<PaidRoundedIcon />}>
                                  {transfer.fromName} pays {transfer.toName}{" "}
                                  {formatMoney(transfer.amountCents, settlement.data.currency)}
                                </Alert>
                              ))
                            ) : (
                              <Alert severity="info">Everyone is square already.</Alert>
                            )}

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                              <Button
                                variant="contained"
                                startIcon={<ContentCopyRoundedIcon />}
                                onClick={copySummary}
                              >
                                Copy summary
                              </Button>
                              <Button
                                variant="outlined"
                                startIcon={<AutorenewRoundedIcon />}
                                onClick={startOver}
                              >
                                Start over
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, lg: 5 }}>
                      <Stack spacing={2}>
                        {settlement.data.people.map((person) => (
                          <Card key={person.participantId}>
                            <CardContent>
                              <Stack spacing={1.25}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="h3">{person.name}</Typography>
                                    {person.isPayer && <Chip label="Payer" color="primary" size="small" />}
                                  </Stack>
                                  <Chip
                                    label={
                                      person.netCents > 0
                                        ? "Gets reimbursed"
                                        : person.netCents < 0
                                          ? "Needs to pay"
                                          : "Settled"
                                    }
                                    color={person.netCents > 0 ? "secondary" : person.netCents < 0 ? "primary" : "default"}
                                  />
                                </Stack>
                                <Divider />
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography color="text.secondary">Consumed</Typography>
                                  <Typography fontWeight={700}>
                                    {formatMoney(person.consumedCents, settlement.data.currency)}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography color="text.secondary">Paid</Typography>
                                  <Typography fontWeight={700}>
                                    {formatMoney(person.paidCents, settlement.data.currency)}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography color="text.secondary">Net</Typography>
                                  <Typography fontWeight={800}>
                                    {formatMoney(person.netCents, settlement.data.currency)}
                                  </Typography>
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Grid>
                  </Grid>
                )}

                {activeStep === 3 && !settlement.ok && (
                  <Alert severity="error">
                    Fix the earlier steps before viewing the final settlement.
                  </Alert>
                )}

                <Stack
                  direction={{ xs: "column-reverse", sm: "row" }}
                  spacing={1.25}
                  justifyContent="space-between"
                  alignItems={{ sm: "center" }}
                >
                  <Button variant="text" onClick={handleBack} disabled={activeStep === 0}>
                    Back
                  </Button>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                    <Button variant="outlined" onClick={startOver}>
                      Reset draft
                    </Button>
                    {activeStep < STEP_LABELS.length - 1 && (
                      <Button variant="contained" endIcon={<ArrowForwardRoundedIcon />} onClick={handleNext}>
                        Continue
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <Dialog open={showRestoreDialog}>
        <DialogTitle>Restore your last split?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            We found a draft in this browser. Restore it and keep going, or start from a clean receipt.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={discardDraft}>Start clean</Button>
          <Button variant="contained" onClick={restoreDraft}>
            Restore draft
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={saveNoticeOpen} autoHideDuration={3500} onClose={() => setSaveNoticeOpen(false)}>
        <Alert severity="success" variant="filled">
          Draft restored.
        </Alert>
      </Snackbar>

      <Snackbar open={copyNoticeOpen} autoHideDuration={3000} onClose={() => setCopyNoticeOpen(false)}>
        <Alert severity="success" variant="filled">
          Summary copied.
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;

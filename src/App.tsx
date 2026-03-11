import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ContentPasteRoundedIcon from "@mui/icons-material/ContentPasteRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import PsychologyAltRoundedIcon from "@mui/icons-material/PsychologyAltRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
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
  ButtonBase,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode
} from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  computeItemPreview,
  computeSettlement,
  createDefaultValues,
  createEmptyItem,
  createId,
  formatMoney,
  formatMoneyTrailingSymbol,
  parseMoneyToCents,
  rebalancePercentAllocations,
  resetPercentAllocations,
  resetShareAllocations,
  syncItemAllocations,
  type AllocationFormValue,
  type ParticipantFormValue,
  type SplitFormValues,
  type SplitMode,
  validateStepOne,
  validateStepThree,
  validateStepTwo
} from "./domain/splitter";
import { buildReceiptLlmPrompt, getReceiptLlmProviderUrl, type LlmProvider } from "./receipt-import/llmHandoff";
import { parsePastedItems } from "./receipt-import/parsePastedItems";
import type { ReceiptImportItem } from "./receipt-import/types";
import { clearStoredDraft, loadStoredDraft, storeDraft } from "./storage";

const STEP_LABELS = [
  "People & payer",
  "Items & prices",
  "Consumption grid",
  "Results"
] as const;

const CURRENCY_OPTIONS = [
  { code: "EUR", label: "Euro (€)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "BRL", label: "Brazilian Real (R$)" },
  { code: "CHF", label: "Swiss Franc (CHF)" }
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
  const [hasStarted, setHasStarted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [hasUnlockedFullNavigation, setHasUnlockedFullNavigation] = useState(
    Boolean(storedDraft?.hasUnlockedFullNavigation || (storedDraft?.step ?? 0) >= 1)
  );
  const [participantInput, setParticipantInput] = useState("");
  const [showRestoreDialog, setShowRestoreDialog] = useState(Boolean(storedDraft));
  const [saveNoticeOpen, setSaveNoticeOpen] = useState(false);
  const [copyNoticeOpen, setCopyNoticeOpen] = useState(false);
  const [copiedLlmPromptNoticeOpen, setCopiedLlmPromptNoticeOpen] = useState(false);
  const [llmPromptErrorNoticeOpen, setLlmPromptErrorNoticeOpen] = useState(false);
  const [pdfNoticeOpen, setPdfNoticeOpen] = useState(false);
  const [pdfErrorNoticeOpen, setPdfErrorNoticeOpen] = useState(false);
  const [exportPdfPending, setExportPdfPending] = useState(false);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [importApplyDialogOpen, setImportApplyDialogOpen] = useState(false);
  const [importApplyMode, setImportApplyMode] = useState<"append" | "replace">("append");
  const [pasteInput, setPasteInput] = useState("");
  const [pendingImportedItems, setPendingImportedItems] = useState<ReceiptImportItem[]>([]);
  const [pendingImportWarnings, setPendingImportWarnings] = useState<string[]>([]);
  const [pendingImportSourceLabel, setPendingImportSourceLabel] = useState("");
  const [receiptImportStatus, setReceiptImportStatus] = useState<
    | { state: "idle" }
    | { state: "processing"; fileName: string }
    | { state: "success"; fileName: string; importedCount: number; warnings: string[] }
    | { state: "error"; message: string }
  >({ state: "idle" });
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const llmPrompt = buildReceiptLlmPrompt();

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

  const itemsArray = useFieldArray({
    control,
    name: "items",
    keyName: "fieldKey"
  });

  const watchedValues = useWatch({ control }) as SplitFormValues;
  const deferredValues = useDeferredValue(watchedValues);
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
      hasUnlockedFullNavigation,
      step: activeStep,
      values: watchedValues
    });
  }, [activeStep, hasUnlockedFullNavigation, showRestoreDialog, watchedValues]);

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

    const nextStep = Math.min(activeStep + 1, STEP_LABELS.length - 1);
    if (nextStep >= 1) {
      setHasUnlockedFullNavigation(true);
    }

    startTransition(() => {
      setActiveStep(nextStep);
    });
  }

  function handleBack() {
    startTransition(() => {
      setActiveStep((currentStep) => Math.max(currentStep - 1, 0));
    });
  }

  function canNavigateToStep(targetStep: number) {
    return hasUnlockedFullNavigation || targetStep <= 1;
  }

  function handleStepNavigation(targetStep: number) {
    if (!canNavigateToStep(targetStep)) {
      return;
    }

    if (targetStep >= 1) {
      setHasUnlockedFullNavigation(true);
    }

    startTransition(() => {
      setActiveStep(targetStep);
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
    const currentValues = getValues();
    const nextParticipants = [...currentValues.participants, nextParticipant];

    reset({
      ...currentValues,
      participants: nextParticipants,
      payerParticipantId: currentValues.payerParticipantId || nextParticipant.id,
      items: syncItemAllocations(currentValues.items, nextParticipants)
    });
    setParticipantInput("");
  }

  function removeParticipant(index: number) {
    const currentValues = getValues();
    const currentParticipants = currentValues.participants;
    const participantToRemove = currentParticipants[index];
    const nextParticipants = currentParticipants.filter((_, currentIndex) => currentIndex !== index);

    reset({
      ...currentValues,
      participants: nextParticipants,
      payerParticipantId:
        participantToRemove?.id === currentValues.payerParticipantId
          ? (nextParticipants[0]?.id ?? "")
          : currentValues.payerParticipantId,
      items: syncItemAllocations(currentValues.items, nextParticipants)
    });
  }

  function addItem() {
    const currentValues = getValues();

    reset({
      ...currentValues,
      items: [...currentValues.items, createEmptyItem(currentValues.participants)]
    });
  }

  function removeItem(index: number) {
    const currentValues = getValues();

    reset({
      ...currentValues,
      items: currentValues.items.filter((_, currentIndex) => currentIndex !== index)
    });
  }

  function resetItems() {
    const currentValues = getValues();

    reset({
      ...currentValues,
      items: []
    });
    clearErrors("items");
    setReceiptImportStatus({ state: "idle" });
  }

  function reorderItems(oldIndex: number, newIndex: number) {
    if (oldIndex === newIndex || newIndex < 0 || newIndex >= items.length) {
      return;
    }

    itemsArray.move(oldIndex, newIndex);
  }

  function applyImportedItems(importedItems: ReceiptImportItem[], mode: "append" | "replace") {
    const currentValues = getValues();
    const preservedItems =
      mode === "append"
        ? currentValues.items.filter((item) => item.name.trim() || item.price.trim())
        : [];
    const mappedItems = importedItems.map((item) => ({
      ...createEmptyItem(currentValues.participants),
      name: item.name,
      price: item.price
    }));

    reset({
      ...currentValues,
      items: [...preservedItems, ...mappedItems]
    });
  }

  function queueImportedItems(importedItems: ReceiptImportItem[], warnings: string[], sourceLabel: string) {
    setReceiptImportStatus({ state: "idle" });
    setPendingImportedItems(importedItems);
    setPendingImportWarnings(warnings);
    setPendingImportSourceLabel(sourceLabel);
    setImportApplyMode("append");
    setImportApplyDialogOpen(true);
  }

  function confirmImportApply() {
    applyImportedItems(pendingImportedItems, importApplyMode);
    setImportApplyDialogOpen(false);
    setReceiptImportStatus({
      state: "success",
      fileName: pendingImportSourceLabel,
      importedCount: pendingImportedItems.length,
      warnings: pendingImportWarnings
    });
    setPendingImportedItems([]);
    setPendingImportWarnings([]);
    setPendingImportSourceLabel("");
  }

  function closeImportApplyDialog() {
    setImportApplyDialogOpen(false);
    setReceiptImportStatus({ state: "idle" });
    setPendingImportedItems([]);
    setPendingImportWarnings([]);
    setPendingImportSourceLabel("");
  }

  function handleItemSubmitFromEnter(index: number) {
    const currentValues = getValues();
    const currentItems = currentValues.items;
    const currentItem = currentItems[index];

    if (!currentItem) {
      return;
    }

    const itemName = currentItem.name.trim();
    const itemPrice = currentItem.price.trim();

    if (!itemName && !itemPrice) {
      const nextItems = currentItems.filter((_, currentIndex) => currentIndex !== index);
      const nextValues = {
        ...currentValues,
        items: nextItems
      };

      reset(nextValues);

      if (validateStepTwo(nextValues).length === 0) {
        setHasUnlockedFullNavigation(true);
        startTransition(() => {
          setActiveStep(2);
        });
      }

      return;
    }

    if (!itemName) {
      return;
    }

    const parsedAmount = parseMoneyToCents(currentItem.price);
    if (parsedAmount === null || parsedAmount === 0) {
      return;
    }

    if (index === currentItems.length - 1) {
      addItem();
      window.setTimeout(() => {
        const nextInput = document.querySelector<HTMLInputElement>(`input[name="items.${index + 1}.name"]`);
        nextInput?.focus();
      }, 0);
      return;
    }

    const nextInput = document.querySelector<HTMLInputElement>(`input[name="items.${index + 1}.name"]`);
    nextInput?.focus();
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

  function setItemAllocations(itemIndex: number, nextAllocations: AllocationFormValue[]) {
    setValue(`items.${itemIndex}.allocations`, nextAllocations, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false
    });
    clearErrors(`items.${itemIndex}.allocations`);
  }

  function toggleEvenAllocation(itemIndex: number, allocationIndex: number) {
    const currentAllocations = getValues(`items.${itemIndex}.allocations`) as AllocationFormValue[];
    const nextAllocations = currentAllocations.map((allocation, currentIndex) =>
      currentIndex === allocationIndex
        ? { ...allocation, evenIncluded: !allocation.evenIncluded }
        : allocation
    );

    setItemAllocations(itemIndex, nextAllocations);
  }

  function formatEditableNumber(value: number) {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toFixed(2).replace(/\.?0+$/, "");
  }

  function updateShareValue(itemIndex: number, allocationIndex: number, nextValue: string) {
    const currentAllocations = getValues(`items.${itemIndex}.allocations`) as AllocationFormValue[];
    const nextAllocations = currentAllocations.map((allocation, currentIndex) =>
      currentIndex === allocationIndex
        ? { ...allocation, shares: nextValue }
        : allocation
    );

    setItemAllocations(itemIndex, nextAllocations);
  }

  function nudgeShareValue(itemIndex: number, allocationIndex: number, direction: 1 | -1) {
    const currentAllocations = getValues(`items.${itemIndex}.allocations`) as AllocationFormValue[];
    const currentValue = Number(currentAllocations[allocationIndex]?.shares || 0);
    const safeCurrentValue = Number.isFinite(currentValue) ? currentValue : 0;
    const nextValue = Math.max(0, safeCurrentValue + direction);

    updateShareValue(itemIndex, allocationIndex, formatEditableNumber(nextValue));
  }

  function zeroShareValue(itemIndex: number, allocationIndex: number) {
    updateShareValue(itemIndex, allocationIndex, "0");
  }

  function resetShareValues(itemIndex: number) {
    const currentAllocations = getValues(`items.${itemIndex}.allocations`) as AllocationFormValue[];
    setItemAllocations(itemIndex, resetShareAllocations(currentAllocations));
  }

  function updatePercentValue(itemIndex: number, participantId: string, nextValue: string) {
    const currentAllocations = getValues(`items.${itemIndex}.allocations`) as AllocationFormValue[];
    const nextAllocations = rebalancePercentAllocations(currentAllocations, participantId, nextValue);

    if (!nextAllocations) {
      return;
    }

    setItemAllocations(itemIndex, nextAllocations);
  }

  function nudgePercentValue(itemIndex: number, participantId: string, direction: 1 | -1) {
    const currentAllocations = getValues(`items.${itemIndex}.allocations`) as AllocationFormValue[];
    const currentAllocation = currentAllocations.find((allocation) => allocation.participantId === participantId);
    const currentValue = Number(currentAllocation?.percent || 0);
    const safeCurrentValue = Number.isFinite(currentValue) ? currentValue : 0;
    const nextValue = Math.max(0, Math.min(100, safeCurrentValue + direction));

    updatePercentValue(itemIndex, participantId, formatEditableNumber(nextValue));
  }

  function zeroPercentValue(itemIndex: number, participantId: string) {
    updatePercentValue(itemIndex, participantId, "0");
  }

  function resetPercentValues(itemIndex: number) {
    const currentAllocations = getValues(`items.${itemIndex}.allocations`) as AllocationFormValue[];
    setItemAllocations(itemIndex, resetPercentAllocations(currentAllocations));
  }

  function restoreDraft() {
    if (!storedDraft) {
      setShowRestoreDialog(false);
      return;
    }

    reset(storedDraft.values);
    setActiveStep(storedDraft.step);
    setHasUnlockedFullNavigation(Boolean(storedDraft.hasUnlockedFullNavigation || storedDraft.step >= 1));
    setHasStarted(true);
    setShowRestoreDialog(false);
    setSaveNoticeOpen(true);
  }

  function discardDraft() {
    clearStoredDraft();
    reset(createDefaultValues());
    setActiveStep(0);
    setHasUnlockedFullNavigation(false);
    setHasStarted(false);
    setReceiptImportStatus({ state: "idle" });
    setShowRestoreDialog(false);
  }

  function startOver() {
    clearStoredDraft();
    reset(createDefaultValues());
    setActiveStep(0);
    setHasUnlockedFullNavigation(false);
    setHasStarted(false);
    setReceiptImportStatus({ state: "idle" });
  }

  async function copySummary() {
    const settlement = computeSettlement(getValues());
    if (!settlement.ok) {
      return;
    }

    const summary = [
      "Split-Bill summary",
      ...settlement.data.people.map(
        (person) => {
          if (person.isPayer) {
            return `${person.name}: paid ${formatMoney(person.paidCents, settlement.data.currency)} and should get back ${formatMoney(person.netCents, settlement.data.currency)}.`;
          }

          return `${person.name}: owes ${formatMoney(Math.abs(person.netCents), settlement.data.currency)}.`;
        }
      )
    ].join("\n");

    await navigator.clipboard.writeText(summary);
    setCopyNoticeOpen(true);
  }

  async function exportSummaryPdf() {
    const settlement = computeSettlement(getValues());
    if (!settlement.ok) {
      return;
    }

    setPdfErrorNoticeOpen(false);
    setExportPdfPending(true);

    try {
      const { exportSettlementPdf } = await import("./pdf/exportSettlementPdf");
      await exportSettlementPdf(getValues());
      setPdfNoticeOpen(true);
    } catch {
      setPdfErrorNoticeOpen(true);
    } finally {
      setExportPdfPending(false);
    }
  }

  async function handleReceiptFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setReceiptImportStatus({ state: "processing", fileName: file.name });

    try {
      const { importReceipt } = await import("./receipt-import/importReceipt");
      const result = await importReceipt(file);
      queueImportedItems(
        result.items,
        result.warnings.map((warning) => warning.message),
        result.fileName
      );
    } catch (error) {
      setReceiptImportStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Receipt import failed. Try another file."
      });
    }
  }

  async function writeLlmPromptToClipboard() {
    await navigator.clipboard.writeText(llmPrompt);
    setCopiedLlmPromptNoticeOpen(true);
    setLlmPromptErrorNoticeOpen(false);
  }

  async function launchLlmHandoff(provider: LlmProvider) {
    window.open(getReceiptLlmProviderUrl(provider), "_blank", "noopener,noreferrer");

    try {
      await writeLlmPromptToClipboard();
    } catch {
      setLlmPromptErrorNoticeOpen(true);
    }

    setAiDialogOpen(false);
    setPasteDialogOpen(true);
  }

  async function copyLlmPrompt() {
    try {
      await writeLlmPromptToClipboard();
    } catch {
      setLlmPromptErrorNoticeOpen(true);
    }

    setAiDialogOpen(false);
    setPasteDialogOpen(true);
  }

  function handlePastePreviewImport() {
    const result = parsePastedItems(pasteInput);

    if (result.items.length === 0) {
      setReceiptImportStatus({
        state: "error",
        message: result.warnings[0]?.message ?? "No valid items were detected in the pasted text."
      });
      return;
    }

    setPasteDialogOpen(false);
    setPasteInput("");
    queueImportedItems(result.items, result.warnings.map((warning) => warning.message), "pasted list");
  }

  const parsedPasteResult = parsePastedItems(pasteInput);
  const settlement = computeSettlement(deferredValues);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(circle at top left, rgba(239,91,60,0.18), transparent 30%), radial-gradient(circle at right 20%, rgba(15,118,110,0.18), transparent 25%), linear-gradient(180deg, #FFF8F2 0%, #FFFDFC 72%)"
      }}
    >
      {!hasStarted && (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            background:
              "linear-gradient(135deg, rgba(239,91,60,0.95), rgba(246,151,59,0.95) 58%, rgba(15,118,110,0.92))",
            color: "white"
          }}
        >
          <Box sx={{ maxWidth: 1240, mx: "auto", width: "100%", px: { xs: 2, md: 4 }, py: { xs: 4, md: 6 } }}>
            <Grid container spacing={4} alignItems="center">
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack spacing={2.5}>
                  <Typography variant="h1">Split grocery bills without the spreadsheet drama.</Typography>
                  <Typography sx={{ maxWidth: 640, fontSize: { xs: "1rem", md: "1.15rem" }, opacity: 0.9 }}>
                    Add the people, mark who paid, drop in each product, and fine-tune who consumed what.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForwardRoundedIcon />}
                      onClick={() => setHasStarted(true)}
                      sx={{
                        bgcolor: "white",
                        color: "#C64024",
                        "&:hover": { bgcolor: alpha("#FFFFFF", 0.92) }
                      }}
                    >
                      Start splitting
                    </Button>
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
          </Box>
        </Box>
      )}

      {hasStarted && (
        <Box sx={{ maxWidth: 1240, mx: "auto", px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>
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
                </Stack>

                <Grid container spacing={1.5}>
                  {STEP_LABELS.map((label, index) => {
                    const completed = activeStep > index;
                    const current = activeStep === index;

                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 3 }} key={label}>
                        <Box
                          role="button"
                          aria-label={`Go to step ${index + 1}: ${label}`}
                          aria-current={current ? "step" : undefined}
                          tabIndex={canNavigateToStep(index) ? 0 : -1}
                          aria-disabled={!canNavigateToStep(index)}
                          onClick={() => handleStepNavigation(index)}
                          onKeyDown={(event) => {
                            if (!canNavigateToStep(index)) {
                              return;
                            }

                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleStepNavigation(index);
                            }
                          }}
                          sx={{
                            p: 2,
                            borderRadius: "20px",
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
                                : "transparent",
                            cursor: canNavigateToStep(index) ? "pointer" : "not-allowed",
                            opacity: canNavigateToStep(index) ? 1 : 0.55,
                            transition: "border-color 120ms ease, background-color 120ms ease, opacity 120ms ease",
                            "&:hover": canNavigateToStep(index)
                              ? {
                                  borderColor: current ? "primary.main" : alpha("#EF5B3C", 0.28),
                                  bgcolor: current ? alpha("#EF5B3C", 0.1) : alpha("#EF5B3C", 0.04)
                                }
                              : undefined,
                            "&:focus-visible": {
                              outline: "2px solid",
                              outlineColor: alpha("#EF5B3C", 0.45),
                              outlineOffset: 2
                            }
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

                    <TextField
                      select
                      label="Currency"
                      size="small"
                      value={currency}
                      onChange={(event) => setValue("currency", event.target.value.toUpperCase())}
                      sx={{ width: { xs: "100%", md: 220 } }}
                    >
                      {CURRENCY_OPTIONS.map((option) => (
                        <MenuItem key={option.code} value={option.code}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>

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
                                      type="button"
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
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.25}
                      alignItems={{ sm: "center" }}
                      justifyContent="space-between"
                    >
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                        <Button
                          variant="contained"
                          startIcon={<AddRoundedIcon />}
                          onClick={addItem}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          Add item
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<UploadFileRoundedIcon />}
                          onClick={() => receiptInputRef.current?.click()}
                          disabled={receiptImportStatus.state === "processing"}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          {receiptImportStatus.state === "processing" ? "Importing receipt..." : "Import receipt"}
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<PsychologyAltRoundedIcon />}
                          onClick={() => setAiDialogOpen(true)}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          Ask AI
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<ContentPasteRoundedIcon />}
                          onClick={() => setPasteDialogOpen(true)}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          Paste list
                        </Button>
                      </Stack>
                      <Button
                        variant="text"
                        color="inherit"
                        startIcon={<RestartAltRoundedIcon />}
                        onClick={resetItems}
                        disabled={items.length === 0 || receiptImportStatus.state === "processing"}
                        sx={{ alignSelf: { xs: "flex-start", sm: "flex-end" } }}
                      >
                        Reset items
                      </Button>
                      <input
                        ref={receiptInputRef}
                        aria-label="Import receipt file"
                        accept="image/*,.pdf,application/pdf"
                        type="file"
                        hidden
                        onChange={handleReceiptFileSelection}
                      />
                    </Stack>

                    {receiptImportStatus.state === "processing" && (
                      <Alert severity="info">Reading {receiptImportStatus.fileName} and extracting receipt lines.</Alert>
                    )}

                    {receiptImportStatus.state === "success" && (
                      <Alert severity="success">
                        Imported {receiptImportStatus.importedCount} items from {receiptImportStatus.fileName}. Review
                        and edit anything that needs cleanup.
                      </Alert>
                    )}

                    {receiptImportStatus.state === "error" && (
                      <Alert severity="error">{receiptImportStatus.message}</Alert>
                    )}

                    {receiptImportStatus.state === "success" &&
                      receiptImportStatus.warnings.map((warning, index) => (
                        <Alert severity="warning" key={`${index}-${warning}`}>
                          {warning}
                        </Alert>
                      ))}

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
                                <Stack spacing={1.75}>
                                  <Grid container spacing={2}>
                                  <Grid size={{ xs: 12, md: 7 }}>
                                    <TextField
                                      label="Item name"
                                      placeholder="Tomatoes"
                                      fullWidth
                                      {...register(`items.${index}.name` as const)}
                                      error={Boolean(itemNameError)}
                                      helperText={itemNameError}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          handleItemSubmitFromEnter(index);
                                        }
                                      }}
                                      sx={{
                                        "& .MuiInputAdornment-root": {
                                          color: "text.secondary",
                                          fontWeight: 700
                                        },
                                        "& .MuiInputBase-input": {
                                          fontWeight: 700
                                        }
                                      }}
                                      InputProps={{
                                        startAdornment: (
                                          <InputAdornment position="start">#{index + 1}</InputAdornment>
                                        )
                                      }}
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
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          handleItemSubmitFromEnter(index);
                                        }
                                      }}
                                      sx={{
                                        "& .MuiInputBase-input": {
                                          fontWeight: 700
                                        }
                                      }}
                                    />
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 1 }}>
                                    <IconButton
                                      aria-label={`Delete ${item.name || `item ${index + 1}`}`}
                                      onClick={() => removeItem(index)}
                                      sx={{ mt: { md: 1 } }}
                                      type="button"
                                    >
                                      <DeleteOutlineRoundedIcon />
                                    </IconButton>
                                  </Grid>
                                  </Grid>
                                </Stack>
                              </SortableCard>
                            );
                          })}
                        </Stack>
                      </SortableContext>
                    </DndContext>
                  </Stack>
                )}

                {activeStep === 2 && (
                  <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                      Item previews are provisional. Final leftover cents are balanced in the results step.
                    </Typography>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragEnd={handleItemDragEnd}
                    >
                      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                        <Stack spacing={1.5}>
                          {items.map((item, itemIndex) => {
                            const deferredItem =
                              deferredValues.items.find((entry) => entry.id === item.id) ?? item;
                            const itemPreview = computeItemPreview(
                              deferredItem,
                              deferredValues.participants,
                              deferredValues.payerParticipantId,
                              deferredValues.currency
                            );
                            const previewPeople = itemPreview.ok ? itemPreview.data.people : [];
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
                                <Stack spacing={1.75}>
                                  <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={1}
                                    justifyContent="space-between"
                                    alignItems={{ md: "center" }}
                                  >
                                    <Box>
                                      <Typography variant="h6" fontWeight={800}>
                                        {item.name || `Item ${itemIndex + 1}`}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {item.price
                                          ? formatMoneyTrailingSymbol(parseMoneyToCents(item.price) ?? 0, currency)
                                          : "Enter an amount in Step 2"}
                                      </Typography>
                                    </Box>
                                    <Stack
                                      direction={{ xs: "column", sm: "row" }}
                                      spacing={1}
                                      alignItems={{ sm: "center" }}
                                    >
                                      {item.splitMode === "shares" && (
                                        <Button
                                          size="small"
                                          variant="text"
                                          startIcon={<RestartAltRoundedIcon />}
                                          onClick={() => resetShareValues(itemIndex)}
                                        >
                                          Reset row
                                        </Button>
                                      )}
                                      {item.splitMode === "percent" && (
                                        <Button
                                          size="small"
                                          variant="text"
                                          startIcon={<RestartAltRoundedIcon />}
                                          onClick={() => resetPercentValues(itemIndex)}
                                        >
                                          Reset row
                                        </Button>
                                      )}
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
                                        sx={{
                                          alignSelf: { xs: "stretch", md: "center" },
                                          "& .MuiToggleButton-root": {
                                            minHeight: 32,
                                            minWidth: 82,
                                            px: 1.5,
                                            textTransform: "none",
                                            fontWeight: 700
                                          }
                                        }}
                                      >
                                        <ToggleButton value="even">Even</ToggleButton>
                                        <ToggleButton value="shares">Shares</ToggleButton>
                                        <ToggleButton value="percent">Percent</ToggleButton>
                                      </ToggleButtonGroup>
                                    </Stack>
                                  </Stack>

                                  <Grid container spacing={1.25}>
                                    {participants.map((participant, allocationIndex) => {
                                      const allocation = item.allocations[allocationIndex] as
                                        | AllocationFormValue
                                        | undefined;
                                      const previewPerson = previewPeople.find(
                                        (person) => person.participantId === participant.id
                                      );

                                      return (
                                        <Grid size={{ xs: 12, md: 4 }} key={participant.id}>
                                            <Card
                                              variant="outlined"
                                              sx={{
                                                height: "100%",
                                                borderColor: alpha("#1D1D1F", 0.08),
                                                borderRadius: "20px"
                                              }}
                                            >
                                              <CardContent
                                                sx={{
                                                  p: 1.8,
                                                  height: "100%",
                                                  display: "grid",
                                                  gridTemplateRows: "auto 32px 40px",
                                                  rowGap: 1.25
                                                }}
                                              >
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                  <Typography fontWeight={800} fontSize="0.98rem">
                                                    {participant.name}
                                                  </Typography>
                                                  <Typography fontWeight={800} fontSize="0.98rem" color="text.primary">
                                                    {formatMoneyTrailingSymbol(
                                                      previewPerson?.consumedCents ?? 0,
                                                      currency
                                                    )}
                                                  </Typography>
                                                </Stack>

                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                  <Typography variant="body2" color="text.secondary">
                                                    {item.splitMode === "even"
                                                      ? "Even split"
                                                      : item.splitMode === "shares"
                                                        ? "Share units"
                                                        : "Percent"}
                                                  </Typography>
                                                  {item.splitMode !== "even" ? (
                                                    <Button
                                                      size="small"
                                                      color="inherit"
                                                      startIcon={<RemoveCircleOutlineRoundedIcon />}
                                                      onClick={() =>
                                                        item.splitMode === "shares"
                                                          ? zeroShareValue(itemIndex, allocationIndex)
                                                          : zeroPercentValue(itemIndex, participant.id)
                                                      }
                                                      sx={{
                                                        minWidth: 0,
                                                        px: 0.75,
                                                        color: "text.secondary"
                                                      }}
                                                    >
                                                      0
                                                    </Button>
                                                  ) : (
                                                    <Box sx={{ width: 34, height: 24, flexShrink: 0 }} />
                                                  )}
                                                </Stack>

                                                <Box sx={{ height: 40, display: "flex", alignItems: "stretch" }}>
                                                  {item.splitMode === "even" && allocation && (
                                                    <ButtonBase
                                                      onClick={() => toggleEvenAllocation(itemIndex, allocationIndex)}
                                                      sx={{
                                                        width: "100%",
                                                        height: "100%",
                                                        justifyContent: "flex-start",
                                                        gap: 1,
                                                        borderRadius: 1.8,
                                                        px: 1.25,
                                                        border: "1px solid",
                                                        borderColor: allocation.evenIncluded ? "primary.main" : alpha("#1D1D1F", 0.18),
                                                        bgcolor: allocation.evenIncluded ? "primary.main" : "transparent",
                                                        color: allocation.evenIncluded ? "primary.contrastText" : "text.primary",
                                                        fontSize: "0.9rem",
                                                        fontWeight: 700
                                                      }}
                                                    >
                                                      {allocation.evenIncluded ? (
                                                        <CheckCircleRoundedIcon fontSize="small" />
                                                      ) : (
                                                        <CloseRoundedIcon fontSize="small" />
                                                      )}
                                                      {allocation.evenIncluded ? "Included in split" : "Excluded from split"}
                                                    </ButtonBase>
                                                  )}

                                                  {item.splitMode === "shares" && allocation && (
                                                    <TextField
                                                      label="Share units"
                                                      fullWidth
                                                      size="small"
                                                      type="number"
                                                      value={allocation.shares}
                                                      onChange={(event) =>
                                                        updateShareValue(itemIndex, allocationIndex, event.target.value)
                                                      }
                                                      onKeyDown={(event) => {
                                                        if (event.key === "ArrowUp") {
                                                          event.preventDefault();
                                                          nudgeShareValue(itemIndex, allocationIndex, 1);
                                                        }

                                                        if (event.key === "ArrowDown") {
                                                          event.preventDefault();
                                                          nudgeShareValue(itemIndex, allocationIndex, -1);
                                                        }
                                                      }}
                                                      inputProps={{ min: 0, step: 1 }}
                                                      sx={{ "& .MuiInputBase-root": { height: 40 } }}
                                                    />
                                                  )}

                                                  {item.splitMode === "percent" && allocation && (
                                                    <TextField
                                                      label="Percent"
                                                      fullWidth
                                                      size="small"
                                                      type="number"
                                                      value={allocation.percent}
                                                      onChange={(event) =>
                                                        updatePercentValue(itemIndex, participant.id, event.target.value)
                                                      }
                                                      onKeyDown={(event) => {
                                                        if (event.key === "ArrowUp") {
                                                          event.preventDefault();
                                                          nudgePercentValue(itemIndex, participant.id, 1);
                                                        }

                                                        if (event.key === "ArrowDown") {
                                                          event.preventDefault();
                                                          nudgePercentValue(itemIndex, participant.id, -1);
                                                        }
                                                      }}
                                                      inputProps={{ min: 0, max: 100, step: 0.01 }}
                                                      InputProps={{
                                                        endAdornment: <InputAdornment position="end">%</InputAdornment>
                                                      }}
                                                      sx={{ "& .MuiInputBase-root": { height: 40 } }}
                                                    />
                                                  )}
                                                </Box>
                                              </CardContent>
                                            </Card>
                                        </Grid>
                                      );
                                    })}
                                  </Grid>

                                  {allocationError && <Alert severity="error">{allocationError}</Alert>}
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
                  <Stack spacing={2.5}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ md: "center" }}
                    >
                      <Box>
                        <Typography variant="h2">Final balances</Typography>
                      </Box>
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
                          startIcon={<PictureAsPdfRoundedIcon />}
                          onClick={exportSummaryPdf}
                          disabled={exportPdfPending}
                        >
                          {exportPdfPending ? "Exporting PDF..." : "Export PDF"}
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

                    {(() => {
                      const payer = settlement.data.people.find((person) => person.isPayer);
                      const payees = settlement.data.people.filter((person) => !person.isPayer);

                      return (
                        <Stack spacing={1.5}>
                          {payer && (
                            <Card variant="outlined" sx={{ borderRadius: "20px", borderColor: alpha("#EF5B3C", 0.24) }}>
                              <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
                                <Stack spacing={2}>
                                  <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={1.5}
                                    justifyContent="space-between"
                                    alignItems={{ md: "center" }}
                                  >
                                      <Box>
                                        <Typography variant="overline" color="text.secondary">
                                          Payer
                                        </Typography>
                                        <Typography variant="h4">
                                          {payer.name}
                                        </Typography>
                                        <Typography color="text.secondary">
                                          This is the person who paid the full receipt and should be reimbursed.
                                        </Typography>
                                      </Box>
                                    </Stack>

                                  <Grid container spacing={1.5}>
                                    {[
                                      { label: "Paid", value: formatMoney(payer.paidCents, settlement.data.currency) },
                                      {
                                        label: "Consumed",
                                        value: formatMoney(payer.consumedCents, settlement.data.currency)
                                      },
                                      {
                                        label: "Gets back",
                                        value: formatMoney(payer.netCents, settlement.data.currency)
                                      }
                                      ].map((metric) => (
                                        <Grid size={{ xs: 12, md: 4 }} key={metric.label}>
                                          <Box
                                            sx={{
                                              p: 1.75,
                                            borderRadius: "20px",
                                            bgcolor: alpha("#1D1D1F", 0.03)
                                          }}
                                          >
                                            <Typography color="text.secondary">{metric.label}</Typography>
                                            <Typography
                                              variant="h5"
                                              color={metric.label === "Gets back" ? "primary.main" : undefined}
                                            >
                                              {metric.value}
                                            </Typography>
                                          </Box>
                                        </Grid>
                                      ))}
                                  </Grid>
                                </Stack>
                              </CardContent>
                            </Card>
                          )}

                          {payees.length > 0 && (
                            <Stack spacing={1.5}>
                              <Typography variant="h3">Who owes</Typography>
                              <Grid container spacing={1.5}>
                                {payees.map((person) => (
                                  <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={person.participantId}>
                                    <Card
                                      variant="outlined"
                                      sx={{
                                        height: "100%",
                                        borderRadius: "20px",
                                        borderColor: alpha("#1D1D1F", 0.1)
                                      }}
                                    >
                                        <CardContent sx={{ p: 2 }}>
                                          <Stack spacing={0.75}>
                                            <Typography variant="h6" fontWeight={800}>
                                              {person.name}
                                            </Typography>
                                            <Typography variant="h4" color="primary.main" fontWeight={900}>
                                              {formatMoney(Math.abs(person.netCents), settlement.data.currency)}
                                            </Typography>
                                          </Stack>
                                        </CardContent>
                                    </Card>
                                  </Grid>
                                ))}
                              </Grid>
                            </Stack>
                          )}
                        </Stack>
                      );
                    })()}
                  </Stack>
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
        </Box>
      )}

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

      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ask ChatGPT, Claude, or Gemini</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              We copy the prompt for you and open the provider in a new tab. Upload the receipt there, then paste
              the extracted item list back here.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button variant="contained" onClick={() => launchLlmHandoff("chatgpt")}>
                ChatGPT
              </Button>
              <Button variant="contained" onClick={() => launchLlmHandoff("claude")}>
                Claude
              </Button>
              <Button variant="contained" onClick={() => launchLlmHandoff("gemini")}>
                Gemini
              </Button>
            </Stack>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">Expected answer format</Typography>
                  <Typography color="text.secondary">One line per item, using:</Typography>
                  <Typography sx={{ fontFamily: "monospace", fontWeight: 700 }}>Item name - 2.49</Typography>
                </Stack>
              </CardContent>
            </Card>
            <TextField
              label="Prompt"
              value={llmPrompt}
              multiline
              minRows={8}
              InputProps={{ readOnly: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={copyLlmPrompt}>Copy prompt</Button>
          <Button onClick={() => setAiDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pasteDialogOpen} onClose={() => setPasteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Paste item list</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              Paste one item per line. The easiest format is <strong>Bananas - 2.49</strong>.
            </Typography>
            <TextField
              label="Pasted items"
              value={pasteInput}
              onChange={(event) => setPasteInput(event.target.value)}
              multiline
              minRows={10}
              placeholder={"Bananas - 2.49\nMilk - 3.40\nBread - 1.20"}
            />
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">Accepted formats</Typography>
                  <Typography color="text.secondary">Bananas - 2.49</Typography>
                  <Typography color="text.secondary">1. Bananas - 2,49€</Typography>
                  <Typography color="text.secondary">Bananas: 2.49</Typography>
                  <Typography color="text.secondary">Bananas,2.49</Typography>
                </Stack>
              </CardContent>
            </Card>
            {pasteInput.trim() && (
              <Alert severity={parsedPasteResult.items.length > 0 ? "info" : "warning"}>
                Parsed {parsedPasteResult.items.length} item{parsedPasteResult.items.length === 1 ? "" : "s"} and
                ignored {parsedPasteResult.ignoredLines.length} line{parsedPasteResult.ignoredLines.length === 1 ? "" : "s"}.
                {parsedPasteResult.ignoredLines.length > 0 && (
                  <> First ignored: {parsedPasteResult.ignoredLines.slice(0, 3).join(" | ")}</>
                )}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasteInput("")} disabled={!pasteInput.trim()}>
            Reset
          </Button>
          <Button onClick={() => setPasteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePastePreviewImport}>
            Import pasted list
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importApplyDialogOpen} onClose={closeImportApplyDialog} maxWidth="xs" fullWidth>
        <DialogTitle>How should we apply these items?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              {pendingImportSourceLabel
                ? `We found ${pendingImportedItems.length} item${pendingImportedItems.length === 1 ? "" : "s"} from ${pendingImportSourceLabel}.`
                : `We found ${pendingImportedItems.length} item${pendingImportedItems.length === 1 ? "" : "s"}.`}
            </Typography>
            <RadioGroup value={importApplyMode} onChange={(_, value) => setImportApplyMode(value as "append" | "replace")}>
              <FormControlLabel value="append" control={<Radio />} label="Append to current items" />
              <FormControlLabel value="replace" control={<Radio />} label="Replace current items" />
            </RadioGroup>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImportApplyDialog}>Cancel</Button>
          <Button variant="contained" onClick={confirmImportApply}>
            Apply import
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

      <Snackbar
        open={copiedLlmPromptNoticeOpen}
        autoHideDuration={3000}
        onClose={() => setCopiedLlmPromptNoticeOpen(false)}
      >
        <Alert severity="success" variant="filled">
          Prompt copied.
        </Alert>
      </Snackbar>

      <Snackbar
        open={llmPromptErrorNoticeOpen}
        autoHideDuration={4000}
        onClose={() => setLlmPromptErrorNoticeOpen(false)}
      >
        <Alert severity="warning" variant="filled">
          Could not copy the prompt automatically. Use the Copy prompt button.
        </Alert>
      </Snackbar>

      <Snackbar open={pdfNoticeOpen} autoHideDuration={3000} onClose={() => setPdfNoticeOpen(false)}>
        <Alert severity="success" variant="filled">
          PDF exported.
        </Alert>
      </Snackbar>

      <Snackbar open={pdfErrorNoticeOpen} autoHideDuration={3500} onClose={() => setPdfErrorNoticeOpen(false)}>
        <Alert severity="error" variant="filled">
          PDF export failed.
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;

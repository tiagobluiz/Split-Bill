import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import CallSplitRoundedIcon from "@mui/icons-material/CallSplitRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ContentPasteRoundedIcon from "@mui/icons-material/ContentPasteRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import LooksOneRoundedIcon from "@mui/icons-material/LooksOneRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import PsychologyAltRoundedIcon from "@mui/icons-material/PsychologyAltRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
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
import JoyStep from "@mui/joy/Step";
import JoyStepButton from "@mui/joy/StepButton";
import JoyStepIndicator from "@mui/joy/StepIndicator";
import JoyStepper from "@mui/joy/Stepper";
import { CssVarsProvider as JoyCssVarsProvider } from "@mui/joy/styles";
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
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
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
  useMemo,
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
  ITEM_AMOUNT_MAX_CENTS,
  ITEM_AMOUNT_TOO_HIGH_MESSAGE,
  parseMoneyToCents,
  PARTICIPANT_NAME_MAX_LENGTH,
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
import {
  buildReceiptLlmPrompt,
  getReceiptLlmLaunchTarget,
  getReceiptLlmProviderUrl,
  isMobileUserAgent,
  type LlmProvider
} from "./receipt-import/llmHandoff";
import { parsePastedItems } from "./receipt-import/parsePastedItems";
import type { ReceiptImportItem } from "./receipt-import/types";
import { clearStoredDraft, loadStoredDraft, storeDraft } from "./storage";

const STEP_LABELS = [
  "Participants",
  "Items",
  "Split",
  "Balances"
] as const;

const STEP_ICONS = [
  PersonRoundedIcon,
  Inventory2RoundedIcon,
  CallSplitRoundedIcon,
  PaidRoundedIcon
] as const;

function comparePeopleByDisplayOrder<T extends { name: string; isPayer: boolean }>(left: T, right: T) {
  if (left.isPayer !== right.isPayer) {
    return left.isPayer ? -1 : 1;
  }

  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

function parseAllocationNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isEqualSplitAcrossEveryone(item: SplitFormValues["items"][number], participantCount: number) {
  if (participantCount <= 0 || item.allocations.length !== participantCount) {
    return false;
  }

  if (item.splitMode === "even") {
    return item.allocations.every((allocation) => allocation.evenIncluded);
  }

  if (item.splitMode === "shares") {
    return item.allocations.every((allocation) => Math.abs(parseAllocationNumber(allocation.shares) - 1) < 0.001);
  }

  const expectedPercent = 100 / participantCount;
  return item.allocations.every(
    (allocation) => Math.abs(parseAllocationNumber(allocation.percent) - expectedPercent) < 0.001
  );
}

const CURRENCY_OPTIONS = [
  { code: "EUR", label: "Euro (€)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "BRL", label: "Brazilian Real (R$)" },
  { code: "CHF", label: "Swiss Franc (CHF)" }
] as const;

const STEP_SUMMARIES = [
  "Who is in the split and who paid.",
  "Build the receipt manually or import it.",
  "Adjust exactly who consumed each line.",
  "Review the final reimbursement amounts."
] as const;

const SURFACE_RADIUS = 18;
const INNER_RADIUS = 14;

function SortableCard(props: {
  id: string;
  children: ReactNode;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
  showMoveControls?: boolean;
  tone?: "default" | "composer";
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
        overflow: "visible",
        borderRadius: `${SURFACE_RADIUS}px`,
        borderColor:
          props.tone === "composer" ? alpha("#0F766E", 0.18) : alpha("#1D1D1F", 0.08),
        borderStyle: props.tone === "composer" ? "dashed" : "solid",
        bgcolor: props.tone === "composer" ? alpha("#0F766E", 0.025) : "background.paper",
        boxShadow: "0 14px 34px rgba(31, 23, 15, 0.05)"
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
                color: "text.secondary",
                "&:hover": { bgcolor: alpha("#EF5B3C", 0.14) }
              }}
            >
              <DragIndicatorRoundedIcon fontSize="small" />
            </IconButton>
            {props.showMoveControls !== false && (
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
            )}
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
    Boolean(storedDraft?.hasUnlockedFullNavigation || (storedDraft?.step ?? 0) >= 2)
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
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importApplyDialogOpen, setImportApplyDialogOpen] = useState(false);
  const [startOverDialogOpen, setStartOverDialogOpen] = useState(false);
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

  function stripTrailingEmptyItemDraft(values: SplitFormValues) {
    const nextItems = [...values.items];
    const lastItem = nextItems.at(-1);

    if (lastItem && !lastItem.name.trim() && !lastItem.price.trim()) {
      nextItems.pop();
    }

    return {
      ...values,
      items: nextItems
    };
  }

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

  useEffect(() => {
    if (hasUnlockedFullNavigation || activeStep < 1) {
      return;
    }

    if (validateStepTwo(stripTrailingEmptyItemDraft(watchedValues)).length === 0) {
      setHasUnlockedFullNavigation(true);
    }
  }, [activeStep, hasUnlockedFullNavigation, watchedValues]);

  useEffect(() => {
    if (activeStep !== 1) {
      return;
    }

    const hasTrailingDraft = items.some((item) => !item.name.trim() && !item.price.trim());

    if (hasTrailingDraft) {
      return;
    }

    addItem();
  }, [activeStep, items]);

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
      const nextValues = stripTrailingEmptyItemDraft(getValues());
      const stepErrors = validateStepTwo(nextValues);
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
    if (nextStep >= 2) {
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
    if (hasUnlockedFullNavigation) {
      return true;
    }

    if (targetStep === 0) {
      return true;
    }

    if (targetStep === 1) {
      return validateStepOne(getValues()).length === 0;
    }

    if (targetStep >= 2 && activeStep >= 1) {
      return validateStepTwo(stripTrailingEmptyItemDraft(getValues())).length === 0;
    }

    return false;
  }

  function handleStepNavigation(targetStep: number) {
    if (!canNavigateToStep(targetStep)) {
      return;
    }

    if (targetStep >= 2) {
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

  function addItem(name = "", price = "") {
    const currentValues = getValues();
    const hasExistingDraft =
      !name &&
      !price &&
      currentValues.items.some((item) => !item.name.trim() && !item.price.trim());

    if (hasExistingDraft) {
      const existingDraftIndex = currentValues.items.findIndex(
        (item) => !item.name.trim() && !item.price.trim()
      );

      window.setTimeout(() => {
        const nextInput = document.querySelector<HTMLInputElement>(
          `input[name="items.${existingDraftIndex}.name"]`
        );
        nextInput?.focus();
      }, 0);
      return;
    }

    reset({
      ...currentValues,
      items: [
        ...currentValues.items,
        {
          ...createEmptyItem(currentValues.participants),
          name,
          price
        }
      ]
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

  function setExclusiveAllocation(itemIndex: number, allocationIndex: number, participantId: string) {
    const item = getValues(`items.${itemIndex}`);
    const currentAllocations = item.allocations as AllocationFormValue[];

    if (item.splitMode === "even") {
      setItemAllocations(
        itemIndex,
        currentAllocations.map((allocation, currentIndex) => ({
          ...allocation,
          evenIncluded: currentIndex === allocationIndex
        }))
      );
      return;
    }

    if (item.splitMode === "shares") {
      setItemAllocations(
        itemIndex,
        currentAllocations.map((allocation, currentIndex) => ({
          ...allocation,
          shares: currentIndex === allocationIndex ? "1" : "0"
        }))
      );
      return;
    }

    setItemAllocations(
      itemIndex,
      currentAllocations.map((allocation) => ({
        ...allocation,
        percent: allocation.participantId === participantId ? "100" : "0"
      }))
    );
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

  function resetEvenValues(itemIndex: number) {
    const currentAllocations = getValues(`items.${itemIndex}.allocations`) as AllocationFormValue[];
    setItemAllocations(
      itemIndex,
      currentAllocations.map((allocation) => ({ ...allocation, evenIncluded: true }))
    );
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
    setHasUnlockedFullNavigation(Boolean(storedDraft.hasUnlockedFullNavigation || storedDraft.step >= 2));
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
    setHasStarted(true);
    setReceiptImportStatus({ state: "idle" });
  }

  function requestStartOver() {
    setStartOverDialogOpen(true);
  }

  function confirmStartOver() {
    setStartOverDialogOpen(false);
    startOver();
  }

  async function copySummary() {
    const normalizedValues = stripTrailingEmptyItemDraft(getValues());
    const settlement = computeSettlement(normalizedValues);
    if (!settlement.ok) {
      return;
    }

    const orderedPeople = [...settlement.data.people].sort(comparePeopleByDisplayOrder);

    const summary = [
      "Split Bill summary",
      ...orderedPeople.map(
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
    const normalizedValues = stripTrailingEmptyItemDraft(getValues());
    const settlement = computeSettlement(normalizedValues);
    if (!settlement.ok) {
      return;
    }

    setPdfErrorNoticeOpen(false);
    setExportPdfPending(true);

    try {
      const { exportSettlementPdf } = await import("./pdf/exportSettlementPdf");
      await exportSettlementPdf(normalizedValues);
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
    const isMobile = isMobileUserAgent(navigator.userAgent);
    window.open(
      getReceiptLlmProviderUrl(provider, isMobile),
      getReceiptLlmLaunchTarget(isMobile),
      "noopener,noreferrer"
    );

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

  const parsedPasteResult = useMemo(() => parsePastedItems(pasteInput), [pasteInput]);
  const normalizedWatchedValues = useMemo(
    () => stripTrailingEmptyItemDraft(watchedValues),
    [watchedValues]
  );
  const normalizedDeferredValues = useMemo(
    () => stripTrailingEmptyItemDraft(deferredValues),
    [deferredValues]
  );
  const settlement = computeSettlement(normalizedDeferredValues);
  const canAddParticipant = participantInput.trim().length > 0;
  const visibleStepThreeItems = useMemo(
    () =>
      items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.name.trim().length > 0 || item.price.trim().length > 0),
    [items]
  );
  const currentStepIsValid = useMemo(() => {
    if (activeStep === 0) {
      return validateStepOne(watchedValues).length === 0;
    }

    if (activeStep === 1) {
      return validateStepTwo(stripTrailingEmptyItemDraft(watchedValues)).length === 0;
    }

    if (activeStep === 2) {
      return validateStepThree(normalizedWatchedValues).length === 0;
    }

    return true;
  }, [activeStep, normalizedWatchedValues, watchedValues]);
  const currentStepFooterErrors = useMemo(() => {
    if (activeStep !== 0 || currentStepIsValid) {
      return [];
    }

    return Array.from(
      new Set(
        validateStepOne(watchedValues)
          .map((error) => error.message)
          .filter((message) => message !== "Add at least two participants, including the payer.")
      )
    );
  }, [activeStep, currentStepIsValid, watchedValues]);
  const resultsStepErrors = useMemo(() => {
    if (activeStep !== 3 || settlement.ok) {
      return [];
    }

    return Array.from(
      new Set(validateStepThree(normalizedWatchedValues).map((error) => error.message))
    );
  }, [activeStep, normalizedWatchedValues, settlement.ok]);

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
            <Grid container justifyContent="center">
              <Grid size={{ xs: 12, md: 10, lg: 8 }}>
                <Stack spacing={3} alignItems={{ xs: "flex-start", md: "center" }} textAlign={{ md: "center" }}>
                  <Typography variant="h1">Split grocery bills without the spreadsheet drama.</Typography>
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
            </Grid>
          </Box>
        </Box>
      )}

      {hasStarted && (
        <Box sx={{ maxWidth: 1240, mx: "auto", px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>
          <Card id="splitter-wizard">
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="h2">Receipt splitter</Typography>
                    <Typography color="text.secondary">
                      {STEP_SUMMARIES[activeStep]}
                    </Typography>
                  </Box>
                  <Tooltip title="Receipt settings">
                    <IconButton
                      aria-label="Open receipt settings"
                      onClick={() => setSettingsDialogOpen(true)}
                      sx={{ flexShrink: 0 }}
                    >
                      <SettingsRoundedIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Box
                  sx={{
                    display: { xs: "flex", md: "none" },
                    flexDirection: "column",
                    gap: 1.25,
                    px: 0.5,
                    pb: 1.5
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                    sx={{
                      p: 1.25,
                      borderRadius: `${SURFACE_RADIUS}px`,
                      border: "1px solid",
                      borderColor: alpha("#1D1D1F", 0.08),
                      bgcolor: alpha("#FFFFFF", 0.82)
                    }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid",
                        borderColor: alpha("#EF5B3C", 0.3),
                        bgcolor: alpha("#EF5B3C", 0.12),
                        color: "primary.main",
                        flexShrink: 0
                      }}
                    >
                      {(() => {
                        const ActiveIcon = STEP_ICONS[activeStep];
                        return <ActiveIcon fontSize="small" />;
                      })()}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Step {activeStep + 1} of {STEP_LABELS.length}
                      </Typography>
                      <Typography fontWeight={800}>{STEP_LABELS[activeStep]}</Typography>
                    </Box>
                  </Stack>
                  <Box
                    sx={{
                      height: 4,
                      borderRadius: 999,
                      bgcolor: alpha("#1D1D1F", 0.08),
                      overflow: "hidden"
                    }}
                  >
                    <Box
                      sx={{
                        width: `${((activeStep + 1) / STEP_LABELS.length) * 100}%`,
                        height: "100%",
                        borderRadius: 999,
                        bgcolor: "primary.main",
                        transition: "width 180ms ease"
                      }}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <JoyCssVarsProvider>
                    <JoyStepper
                      sx={{
                        "--Stepper-horizontalGap": "1rem",
                        "--StepIndicator-size": "44px",
                        "--Step-gap": "0.625rem",
                        "--Step-connectorInset": "calc(var(--StepIndicator-size) / 2)",
                        "--Step-connectorThickness": "2px",
                        "--Step-connectorRadius": "999px",
                        "--Step-connectorBg": alpha("#1D1D1F", 0.12),
                        px: 1,
                        pb: 2.5
                      }}
                    >
                      {STEP_LABELS.map((label, index) => {
                        const completed = activeStep > index;
                        const current = activeStep === index;
                        const Icon = STEP_ICONS[index];
                        const navigable = canNavigateToStep(index);

                        return (
                          <JoyStep
                            key={label}
                            active={current}
                            completed={completed}
                            disabled={!navigable}
                            indicator={
                              <JoyStepIndicator
                                variant={current ? "soft" : completed ? "soft" : "outlined"}
                                color={current ? "danger" : completed ? "success" : "neutral"}
                                sx={{
                                  borderColor: current
                                    ? alpha("#EF5B3C", 0.32)
                                    : completed
                                      ? alpha("#0F766E", 0.28)
                                      : alpha("#1D1D1F", 0.12),
                                  bgcolor: current
                                    ? alpha("#EF5B3C", 0.12)
                                    : completed
                                      ? alpha("#0F766E", 0.08)
                                      : alpha("#FFFFFF", 0.9),
                                  color: current ? "#EF5B3C" : completed ? "#0F766E" : "text.secondary",
                                  transition:
                                    "transform 140ms ease, box-shadow 140ms ease, background-color 120ms ease, border-color 120ms ease, color 120ms ease"
                                }}
                              >
                                <Icon fontSize="small" />
                              </JoyStepIndicator>
                            }
                            sx={{
                              alignItems: "center",
                              "&:has(button:hover) .MuiStepIndicator-root": navigable
                                ? {
                                    transform: "translateY(-1px) scale(1.05)",
                                    boxShadow: `0 10px 22px ${alpha("#1D1D1F", 0.1)}`
                                  }
                                : undefined
                            }}
                          >
                            <JoyStepButton
                              aria-label={`Go to step ${index + 1}: ${label}`}
                              aria-current={current ? "step" : undefined}
                              disabled={!navigable}
                              onClick={() => handleStepNavigation(index)}
                              sx={{
                                borderRadius: `${INNER_RADIUS}px`,
                                p: 0,
                                backgroundColor: "transparent",
                                textAlign: "center",
                                fontSize: "0.92rem",
                                lineHeight: 1.2,
                                fontWeight: current ? 800 : 700,
                                color: navigable ? "text.primary" : "text.disabled",
                                transition: "transform 140ms ease, color 120ms ease, opacity 120ms ease",
                                opacity: navigable ? 1 : 0.5,
                                "&:hover": navigable
                                  ? {
                                      backgroundColor: "transparent",
                                      transform: "translateY(-1px)"
                                    }
                                  : undefined
                              }}
                            >
                              {label}
                            </JoyStepButton>
                          </JoyStep>
                        );
                      })}
                    </JoyStepper>
                  </JoyCssVarsProvider>
                </Box>

                {activeStep === 0 && (
                  <Stack spacing={3}>
                    {participants.length < 2 && (
                      <Alert severity="info">
                        Add at least two people to continue.
                      </Alert>
                    )}

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
                                borderRadius: `${SURFACE_RADIUS}px`,
                                borderColor:
                                  payerParticipantId === participant.id
                                    ? "primary.main"
                                    : alpha("#1D1D1F", 0.08),
                                borderStyle: "solid",
                                borderWidth: 1,
                                bgcolor: payerParticipantId === participant.id ? alpha("#EF5B3C", 0.04) : "background.paper"
                              }}
                            >
                              <CardContent sx={{ p: { xs: 2, md: 2.25 } }}>
                                <Stack spacing={1.25}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                    <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
                                      <Chip icon={<PersonRoundedIcon />} label={`Person ${index + 1}`} variant="outlined" />
                                      {payerParticipantId === participant.id && (
                                        <Chip
                                          icon={<PaidRoundedIcon />}
                                          label="Payer"
                                          color="primary"
                                          sx={{ fontWeight: 700 }}
                                        />
                                      )}
                                      {payerParticipantId !== participant.id && (
                                        <Chip
                                          label="🏦 Set as payer"
                                          variant="outlined"
                                          clickable
                                          onClick={() => setValue("payerParticipantId", participant.id)}
                                          sx={{ fontWeight: 700 }}
                                        />
                                      )}
                                    </Stack>
                                  </Stack>
                                  <TextField
                                    label="Name"
                                    fullWidth
                                    {...register(`participants.${index}.name` as const)}
                                    error={Boolean(participantError)}
                                    helperText={participantError}
                                    inputProps={{ maxLength: PARTICIPANT_NAME_MAX_LENGTH }}
                                    InputProps={{
                                      endAdornment: (
                                        <InputAdornment position="end">
                                          <IconButton
                                            aria-label={`Remove ${participant.name || `participant ${index + 1}`}`}
                                            onClick={() => removeParticipant(index)}
                                            type="button"
                                            size="small"
                                            edge="end"
                                          >
                                            <DeleteOutlineRoundedIcon />
                                          </IconButton>
                                        </InputAdornment>
                                      )
                                    }}
                                  />
                                </Stack>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}

                      <Grid size={{ xs: 12, md: 6 }}>
                        <Card
                          variant="outlined"
                          sx={{
                            borderRadius: `${SURFACE_RADIUS}px`,
                            borderColor: alpha("#0F766E", 0.18),
                            borderStyle: "dashed",
                            borderWidth: 1,
                            bgcolor: alpha("#0F766E", 0.025),
                            boxShadow: "0 14px 34px rgba(31, 23, 15, 0.05)"
                          }}
                        >
                          <CardContent sx={{ p: { xs: 2, md: 2.25 } }}>
                            <Stack spacing={1.25}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                <Chip
                                  icon={<AddRoundedIcon />}
                                  label="New participant"
                                  variant="outlined"
                                />
                              </Stack>
                              <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1.25}
                                alignItems={{ sm: "center" }}
                              >
                              <TextField
                                label="Name"
                                placeholder="Participant name"
                                name="participant-draft-name"
                                value={participantInput}
                                onChange={(event) => setParticipantInput(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    if (!canAddParticipant) {
                                      handleNext();
                                      return;
                                    }
                                    addParticipant();
                                  }
                                }}
                                fullWidth
                                inputProps={{ maxLength: PARTICIPANT_NAME_MAX_LENGTH }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <IconButton
                                        aria-label="Add person"
                                        onClick={addParticipant}
                                        disabled={!canAddParticipant}
                                        type="button"
                                        edge="end"
                                        size="small"
                                        color="primary"
                                        sx={{
                                          bgcolor: canAddParticipant ? alpha("#EF5B3C", 0.08) : "transparent",
                                          "&:hover": {
                                            bgcolor: canAddParticipant ? alpha("#EF5B3C", 0.14) : "transparent"
                                          }
                                        }}
                                      >
                                        <AddRoundedIcon />
                                      </IconButton>
                                    </InputAdornment>
                                  )
                                }}
                              />
                            </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
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
                      spacing={1.5}
                      alignItems={{ sm: "center" }}
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="subtitle1">Receipt items</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Type directly below, or import a receipt.
                        </Typography>
                      </Box>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ sm: "center" }}
                        useFlexGap
                      >
                        <Button
                          variant="outlined"
                          startIcon={<UploadFileRoundedIcon />}
                          onClick={() => setImportDialogOpen(true)}
                          disabled={receiptImportStatus.state === "processing"}
                          sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
                        >
                          {receiptImportStatus.state === "processing" ? "Importing..." : "Import"}
                        </Button>
                        <Button
                          variant="text"
                          color="inherit"
                          startIcon={<RestartAltRoundedIcon />}
                          onClick={resetItems}
                          disabled={items.length === 0 || receiptImportStatus.state === "processing"}
                          sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
                        >
                          Reset items
                        </Button>
                      </Stack>
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
                            const parsedItemAmount = parseMoneyToCents(item.price);
                            const itemNameMissingWithPrice =
                              item.price.trim().length > 0 && parsedItemAmount !== null && !item.name.trim();
                            const itemNameError =
                              (itemNameMissingWithPrice ? "This item needs a name." : undefined) ??
                              errors.items?.[index]?.name?.message;
                            const itemPriceError = errors.items?.[index]?.price?.message;
                            const itemPriceTooHigh =
                              parsedItemAmount !== null && Math.abs(parsedItemAmount) > ITEM_AMOUNT_MAX_CENTS;

                            return (
                              <SortableCard
                                key={item.id}
                                id={item.id}
                                onMoveUp={() => reorderItems(index, index - 1)}
                                onMoveDown={() => reorderItems(index, index + 1)}
                                disableMoveUp={index === 0}
                                disableMoveDown={index === items.length - 1}
                                showMoveControls={false}
                                tone={!item.name.trim() && !item.price.trim() ? "composer" : "default"}
                              >
                                <Stack spacing={1.75}>
                                  <Grid container spacing={1.5}>
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
                                          startAdornment: <InputAdornment position="start">#{index + 1}</InputAdornment>
                                        }}
                                      />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                      <TextField
                                        label="Price"
                                        placeholder="3.49"
                                        fullWidth
                                        {...register(`items.${index}.price` as const)}
                                        error={Boolean(itemPriceError) || itemPriceTooHigh}
                                        helperText={
                                          itemPriceTooHigh
                                            ? `${ITEM_AMOUNT_TOO_HIGH_MESSAGE} ${currency}.`
                                            : itemPriceError
                                        }
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
                                        inputProps={{
                                          inputMode: "decimal",
                                          maxLength: String(ITEM_AMOUNT_MAX_CENTS / 100).length + 3
                                        }}
                                        sx={{
                                          "& .MuiInputBase-input": {
                                            fontWeight: 700
                                          }
                                        }}
                                      />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 1 }}>
                                      <Stack
                                        direction="row"
                                        justifyContent={{ xs: "flex-end", md: "flex-start" }}
                                        sx={{ mt: { md: 1 } }}
                                      >
                                        <IconButton
                                          aria-label={`Delete ${item.name || `item ${index + 1}`}`}
                                          onClick={() => removeItem(index)}
                                          type="button"
                                        >
                                          <DeleteOutlineRoundedIcon />
                                        </IconButton>
                                      </Stack>
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
                  <Stack spacing={2.25}>
                    <Alert severity="info">
                      These amounts are a preview. Final cents are settled in Balances.
                    </Alert>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragEnd={handleItemDragEnd}
                    >
                      <SortableContext
                        items={visibleStepThreeItems.map(({ item }) => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <Stack spacing={1.5}>
                          {visibleStepThreeItems.map(({ item, index: itemIndex }) => {
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
                            const canResetItem = !isEqualSplitAcrossEveryone(item, participants.length);

                            return (
                              <SortableCard
                                key={item.id}
                                id={item.id}
                                onMoveUp={() => reorderItems(itemIndex, itemIndex - 1)}
                                onMoveDown={() => reorderItems(itemIndex, itemIndex + 1)}
                                disableMoveUp={itemIndex === 0}
                                disableMoveDown={
                                  itemIndex ===
                                  visibleStepThreeItems[visibleStepThreeItems.length - 1]?.index
                                }
                              >
                                <Stack spacing={2}>
                                  <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={1.5}
                                    justifyContent="space-between"
                                    alignItems={{ md: "center" }}
                                  >
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography variant="h4" fontWeight={800}>
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
                                      <Button
                                        size="small"
                                        variant="text"
                                        color="inherit"
                                        startIcon={<RestartAltRoundedIcon />}
                                        onClick={() => {
                                          if (item.splitMode === "even") {
                                            resetEvenValues(itemIndex);
                                          }

                                          if (item.splitMode === "shares") {
                                            resetShareValues(itemIndex);
                                          }

                                          if (item.splitMode === "percent") {
                                            resetPercentValues(itemIndex);
                                          }
                                        }}
                                        disabled={!canResetItem}
                                      >
                                        Reset item
                                      </Button>
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
                                                borderRadius: `${INNER_RADIUS}px`,
                                                bgcolor: alpha("#FFFFFF", 0.84),
                                                boxShadow: "none"
                                              }}
                                            >
                                              <CardContent
                                                sx={{
                                                  px: 1.5,
                                                  py: 1.35,
                                                  height: "100%",
                                                  display: "grid",
                                                  gridTemplateRows: "auto 1fr",
                                                  rowGap: 0.75
                                                }}
                                              >
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
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

                                                <Box
                                                  sx={{
                                                    minHeight: 52,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    pt: 0.5
                                                  }}
                                                >
                                                  {item.splitMode === "even" && allocation && (
                                                    <ButtonBase
                                                      onClick={() => toggleEvenAllocation(itemIndex, allocationIndex)}
                                                      sx={{
                                                        width: "100%",
                                                        height: 48,
                                                        justifyContent: "space-between",
                                                        gap: 1,
                                                        borderRadius: `${INNER_RADIUS}px`,
                                                        px: 1.25,
                                                        border: "1px solid",
                                                        borderColor: allocation.evenIncluded ? alpha("#EF5B3C", 0.5) : alpha("#1D1D1F", 0.16),
                                                        bgcolor: allocation.evenIncluded ? alpha("#EF5B3C", 0.1) : alpha("#1D1D1F", 0.03),
                                                        color: "text.primary",
                                                        fontSize: "0.9rem",
                                                        fontWeight: 700
                                                      }}
                                                    >
                                                      <Stack direction="row" spacing={1} alignItems="center">
                                                        {allocation.evenIncluded ? (
                                                          <CheckCircleRoundedIcon fontSize="small" color="primary" />
                                                        ) : (
                                                          <CloseRoundedIcon fontSize="small" />
                                                        )}
                                                        <Typography fontWeight={700}>
                                                          {allocation.evenIncluded ? "Included" : "Excluded"}
                                                        </Typography>
                                                      </Stack>
                                                      <Stack direction="row" spacing={0.25} alignItems="center">
                                                        <Divider
                                                          orientation="vertical"
                                                          flexItem
                                                          sx={{ mx: 0.25, borderColor: alpha("#1D1D1F", 0.18) }}
                                                        />
                                                        <IconButton
                                                          aria-label={`Only ${participant.name} for this item`}
                                                          onClick={(event) => {
                                                            event.stopPropagation();
                                                            setExclusiveAllocation(
                                                              itemIndex,
                                                              allocationIndex,
                                                              participant.id
                                                            );
                                                          }}
                                                          size="small"
                                                          sx={{ color: "text.secondary" }}
                                                        >
                                                          <LooksOneRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                      </Stack>
                                                    </ButtonBase>
                                                  )}

                                                  {item.splitMode === "shares" && allocation && (
                                                    <Box sx={{ width: "100%" }}>
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
                                                        InputProps={{
                                                          endAdornment: (
                                                            <InputAdornment position="end">
                                                              <Stack direction="row" spacing={0.25} alignItems="center">
                                                                <Divider
                                                                  orientation="vertical"
                                                                  flexItem
                                                                  sx={{ mx: 0.25, borderColor: alpha("#1D1D1F", 0.12) }}
                                                                />
                                                                <IconButton
                                                                  aria-label={`Only ${participant.name} for this item`}
                                                                  onClick={() =>
                                                                    setExclusiveAllocation(
                                                                      itemIndex,
                                                                      allocationIndex,
                                                                      participant.id
                                                                    )
                                                                  }
                                                                  edge="end"
                                                                  size="small"
                                                                  sx={{ color: "text.secondary" }}
                                                                >
                                                                  <LooksOneRoundedIcon fontSize="small" />
                                                                </IconButton>
                                                                <IconButton
                                                                  aria-label={`Exclude ${participant.name} from this item`}
                                                                  onClick={() => zeroShareValue(itemIndex, allocationIndex)}
                                                                  edge="end"
                                                                  size="small"
                                                                  sx={{ color: "text.secondary" }}
                                                                >
                                                                  <CloseRoundedIcon fontSize="small" />
                                                                </IconButton>
                                                              </Stack>
                                                            </InputAdornment>
                                                          )
                                                        }}
                                                        sx={{ "& .MuiInputBase-root": { height: 48 } }}
                                                      />
                                                    </Box>
                                                  )}

                                                  {item.splitMode === "percent" && allocation && (
                                                    <Box sx={{ width: "100%" }}>
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
                                                          startAdornment: (
                                                            <InputAdornment position="start">%</InputAdornment>
                                                          ),
                                                          endAdornment: (
                                                            <InputAdornment position="end">
                                                              <Stack direction="row" spacing={0.25} alignItems="center">
                                                                <Divider
                                                                  orientation="vertical"
                                                                  flexItem
                                                                  sx={{ mx: 0.25, borderColor: alpha("#1D1D1F", 0.12) }}
                                                                />
                                                                <IconButton
                                                                  aria-label={`Only ${participant.name} for this item`}
                                                                  onClick={() =>
                                                                    setExclusiveAllocation(
                                                                      itemIndex,
                                                                      allocationIndex,
                                                                      participant.id
                                                                    )
                                                                  }
                                                                  edge="end"
                                                                  size="small"
                                                                  sx={{ color: "text.secondary" }}
                                                                >
                                                                  <LooksOneRoundedIcon fontSize="small" />
                                                                </IconButton>
                                                                <IconButton
                                                                  aria-label={`Exclude ${participant.name} from this item`}
                                                                  onClick={() => zeroPercentValue(itemIndex, participant.id)}
                                                                  edge="end"
                                                                  size="small"
                                                                  sx={{ color: "text.secondary" }}
                                                                >
                                                                  <CloseRoundedIcon fontSize="small" />
                                                                </IconButton>
                                                              </Stack>
                                                            </InputAdornment>
                                                          )
                                                        }}
                                                        sx={{ "& .MuiInputBase-root": { height: 48 } }}
                                                      />
                                                    </Box>
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
                          {exportPdfPending ? "Exporting PDF..." : "Export to PDF"}
                        </Button>
                      </Stack>
                    </Stack>

                    {(() => {
                      const payer = settlement.data.people.find((person) => person.isPayer);
                      const payees = [...settlement.data.people]
                        .filter((person) => !person.isPayer)
                        .sort((left, right) =>
                          left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
                        );

                      return (
                        <Grid container spacing={2}>
                          {payer && (
                            <Grid size={{ xs: 12, lg: 5 }}>
                              <Card
                                variant="outlined"
                                sx={{
                                  height: "100%",
                                  borderRadius: `${SURFACE_RADIUS}px`,
                                  borderColor: alpha("#EF5B3C", 0.18),
                                  bgcolor: alpha("#FFFFFF", 0.82)
                                }}
                              >
                                <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
                                  <Stack spacing={2}>
                                    <Box>
                                      <Typography variant="overline" color="text.secondary">
                                        Payer
                                      </Typography>
                                      <Typography variant="h3">{payer.name}</Typography>
                                    </Box>
                                    <Box
                                      sx={{
                                        p: 2,
                                        borderRadius: `${INNER_RADIUS}px`,
                                        bgcolor: alpha("#EF5B3C", 0.08),
                                        border: "1px solid",
                                        borderColor: alpha("#EF5B3C", 0.16)
                                      }}
                                    >
                                      <Typography color="text.secondary">Collect</Typography>
                                      <Typography variant="h2" color="primary.main">
                                        {formatMoney(payer.netCents, settlement.data.currency)}
                                      </Typography>
                                    </Box>
                                    <Grid container spacing={1.25}>
                                      {[
                                        { label: "Paid", value: formatMoney(payer.paidCents, settlement.data.currency) },
                                        {
                                          label: "Consumed",
                                          value: formatMoney(payer.consumedCents, settlement.data.currency)
                                        }
                                      ].map((metric) => (
                                        <Grid size={{ xs: 12, sm: 6 }} key={metric.label}>
                                          <Box
                                            sx={{
                                              p: 1.5,
                                              borderRadius: `${INNER_RADIUS}px`,
                                              bgcolor: alpha("#1D1D1F", 0.03)
                                            }}
                                          >
                                            <Typography color="text.secondary">{metric.label}</Typography>
                                            <Typography variant="h5">{metric.value}</Typography>
                                          </Box>
                                        </Grid>
                                      ))}
                                    </Grid>
                                  </Stack>
                                </CardContent>
                              </Card>
                            </Grid>
                          )}

                          <Grid size={{ xs: 12, lg: payer ? 7 : 12 }}>
                            <Card
                              variant="outlined"
                              sx={{
                                height: "100%",
                                borderRadius: `${SURFACE_RADIUS}px`,
                                borderColor: alpha("#1D1D1F", 0.08),
                                bgcolor: alpha("#FFFFFF", 0.82)
                              }}
                            >
                              <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
                                <Stack spacing={1.5}>
                                  <Typography variant="h3">Who owes</Typography>
                                  {payees.length > 0 ? (
                                    <Stack spacing={1}>
                                      {payees.map((person) => (
                                        <Box
                                          key={person.participantId}
                                          sx={{
                                            px: 1.75,
                                            py: 1.5,
                                            borderRadius: `${INNER_RADIUS}px`,
                                            bgcolor: alpha("#1D1D1F", 0.03),
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 2
                                          }}
                                        >
                                          <Typography variant="subtitle1" fontWeight={800}>
                                            {person.name}
                                          </Typography>
                                          <Typography variant="h4" color="primary.main" fontWeight={900}>
                                            {formatMoney(Math.abs(person.netCents), settlement.data.currency)}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Stack>
                                  ) : (
                                    <Typography color="text.secondary">
                                      Everyone is already balanced. No reimbursements are needed.
                                    </Typography>
                                  )}
                                </Stack>
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>
                      );
                    })()}
                  </Stack>
                )}

                {activeStep === 3 && !settlement.ok && (
                  <Alert severity="error">
                    <Stack spacing={0.25}>
                      <Typography variant="body2" fontWeight={700}>
                        Fix these items before viewing the final settlement:
                      </Typography>
                      {(resultsStepErrors.length > 0
                        ? resultsStepErrors
                        : ["The split is still invalid. Review the previous steps and adjust the receipt or allocation."])
                        .map((message) => (
                          <Typography key={message} variant="body2">
                            {message}
                          </Typography>
                        ))}
                    </Stack>
                  </Alert>
                )}

                <Stack spacing={1.25}>
                  {currentStepFooterErrors.length > 0 && (
                    <Alert severity="error" sx={{ width: "100%" }}>
                      <Stack spacing={0.25}>
                        {currentStepFooterErrors.map((message) => (
                          <Typography key={message} variant="body2">
                            {message}
                          </Typography>
                        ))}
                      </Stack>
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
                      <Button
                        variant="outlined"
                        onClick={requestStartOver}
                        startIcon={<AutorenewRoundedIcon />}
                      >
                        Start over
                      </Button>
                      {activeStep < STEP_LABELS.length - 1 && (
                        <Button
                          variant="contained"
                          endIcon={<ArrowForwardRoundedIcon />}
                          onClick={handleNext}
                          disabled={!currentStepIsValid}
                        >
                          Continue
                        </Button>
                      )}
                    </Stack>
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

      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Import items</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <Grid container spacing={1.25}>
              {[
                {
                  icon: <PsychologyAltRoundedIcon color="primary" />,
                  title: "Ask AI",
                  description: "Preferred. Usually the most accurate way to turn a receipt into a clean item list.",
                  onClick: () => {
                    setImportDialogOpen(false);
                    setAiDialogOpen(true);
                  },
                  recommended: true
                },
                {
                  icon: <ContentPasteRoundedIcon color="primary" />,
                  title: "Paste list",
                  description: "Paste a simple item list or CSV and import it directly.",
                  onClick: () => {
                    setImportDialogOpen(false);
                    setPasteDialogOpen(true);
                  }
                },
                {
                  icon: <UploadFileRoundedIcon color="primary" />,
                  title: "Import receipt",
                  description: "Fastest direct option, but accuracy can vary depending on the receipt.",
                  onClick: () => {
                    setImportDialogOpen(false);
                    receiptInputRef.current?.click();
                  },
                  disabled: receiptImportStatus.state === "processing"
                }
              ].map((option) => (
                <Grid size={12} key={option.title}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: `${INNER_RADIUS}px`,
                      borderColor: alpha("#1D1D1F", 0.08),
                      bgcolor: alpha("#FFFFFF", 0.86)
                    }}
                  >
                    <ButtonBase
                      onClick={option.onClick}
                      disabled={option.disabled}
                      sx={{
                        width: "100%",
                        textAlign: "left",
                        p: 1.5,
                        display: "block",
                        borderRadius: `${INNER_RADIUS}px`
                      }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 999,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: alpha("#EF5B3C", 0.08),
                            flexShrink: 0
                          }}
                        >
                          {option.icon}
                        </Box>
                        <Stack spacing={0.35} minWidth={0}>
                          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
                            <Typography fontWeight={800}>{option.title}</Typography>
                            {"recommended" in option && option.recommended && (
                              <Chip
                                label="Recommended"
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 700 }}
                              />
                            )}
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {option.description}
                          </Typography>
                        </Stack>
                      </Stack>
                    </ButtonBase>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Receipt settings</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField
              select
              label="Currency"
              value={currency}
              onChange={(event) => setValue("currency", event.target.value.toUpperCase())}
              fullWidth
            >
              {CURRENCY_OPTIONS.map((option) => (
                <MenuItem key={option.code} value={option.code}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={startOverDialogOpen} onClose={() => setStartOverDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Start over?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This clears the current split and restarts the flow from Step 1.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartOverDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" startIcon={<AutorenewRoundedIcon />} onClick={confirmStartOver}>
            Start over
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

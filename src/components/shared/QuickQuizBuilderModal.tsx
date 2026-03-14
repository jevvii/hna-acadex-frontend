import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { RichTextInput } from './RichTextInput';
import { DateTimePickerModal } from './DateTimePickerModal';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Types
type QuestionType = 'multiple_choice' | 'true_false' | 'essay';

interface Question {
  id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  choices: Array<{
    id: string;
    choice_text: string;
    is_correct: boolean;
  }>;
  rubric?: string;
}

interface WeeklyModule {
  id: string;
  week_number: number;
  title: string;
}

interface QuickQuizBuilderModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (quiz: {
    title: string;
    instructions: string;
    weekly_module_id: string | null;
    attempt_limit: number;
    time_limit_minutes: number;
    open_at: Date | null;
    close_at: Date | null;
    questions: Question[];
  }) => Promise<void>;
  modules: WeeklyModule[];
  isCreating?: boolean;
}

// Stepper component for numeric values
function Stepper({
  value,
  onValueChange,
  min = 1,
  max = 10,
  label,
}: {
  value: number;
  onValueChange: (val: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const handleDecrease = () => {
    if (value > min) onValueChange(value - 1);
  };
  const handleIncrease = () => {
    if (value < max) onValueChange(value + 1);
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
          onPress={handleDecrease}
          disabled={value <= min}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={20} color={value <= min ? '#CBD5E1' : Colors.primary} />
        </TouchableOpacity>
        <View style={styles.stepperValue}>
          <Text style={styles.stepperValueText}>{value}</Text>
        </View>
        <TouchableOpacity
          style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
          onPress={handleIncrease}
          disabled={value >= max}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={value >= max ? '#CBD5E1' : Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Segmented control for selecting options
function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onValueChange: (val: T) => void;
}) {
  return (
    <View style={styles.segmentedControl}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
            onPress={() => onValueChange(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentBtnText, isActive && styles.segmentBtnTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Collapsible Question Card component
function QuestionCard({
  question,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  validationErrors,
}: {
  question: Question;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (q: Question) => void;
  onDelete: () => void;
  validationErrors: Record<string, string>;
}) {
  const [charCount, setCharCount] = useState(question.question_text.length);
  const heightValue = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    heightValue.value = withTiming(isExpanded ? 1 : 0, { duration: 250 });
  }, [isExpanded, heightValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(heightValue.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(heightValue.value, [0, 1], [-10, 0]) }],
  }));

  const questionTypeLabel = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True/False',
    essay: 'Essay',
  }[question.question_type];

  const hasError = validationErrors[`question_${index}`] || validationErrors[`question_${index}_text`];

  const renderSwipeActions = () => (
    <View style={styles.deleteAction}>
      <Ionicons name="trash" size={24} color="#FFFFFF" />
    </View>
  );

  const handleTypeChange = (type: QuestionType) => {
    let newChoices = question.choices;
    if (type === 'true_false') {
      newChoices = [
        { id: `tf_true_${Date.now()}`, choice_text: 'True', is_correct: true },
        { id: `tf_false_${Date.now()}`, choice_text: 'False', is_correct: false },
      ];
    } else if (type === 'multiple_choice') {
      newChoices = [
        { id: `mc_${Date.now()}_1`, choice_text: '', is_correct: true },
        { id: `mc_${Date.now()}_2`, choice_text: '', is_correct: false },
        { id: `mc_${Date.now()}_3`, choice_text: '', is_correct: false },
        { id: `mc_${Date.now()}_4`, choice_text: '', is_correct: false },
      ];
    } else {
      newChoices = [];
    }
    onUpdate({ ...question, question_type: type, choices: newChoices });
  };

  const handleChoiceTap = (choiceIndex: number) => {
    const newChoices = question.choices.map((c, i) => ({
      ...c,
      is_correct: i === choiceIndex,
    }));
    onUpdate({ ...question, choices: newChoices });
  };

  const updateChoiceText = (choiceIndex: number, text: string) => {
    const newChoices = question.choices.map((c, i) =>
      i === choiceIndex ? { ...c, choice_text: text } : c
    );
    onUpdate({ ...question, choices: newChoices });
  };

  const addChoice = () => {
    if (question.choices.length < 6) {
      onUpdate({
        ...question,
        choices: [...question.choices, { id: `mc_${Date.now()}`, choice_text: '', is_correct: false }],
      });
    }
  };

  const removeChoice = (choiceIndex: number) => {
    if (question.choices.length > 2) {
      const newChoices = question.choices.filter((_, i) => i !== choiceIndex);
      // Ensure at least one is correct
      if (!newChoices.some(c => c.is_correct) && newChoices.length > 0) {
        newChoices[0].is_correct = true;
      }
      onUpdate({ ...question, choices: newChoices });
    }
  };

  return (
    <Swipeable
      renderRightActions={renderSwipeActions}
      onSwipeableWillOpen={onDelete}
      overshootRight={false}
      friction={2}
    >
      <View style={[styles.questionCard, hasError ? styles.questionCardError : undefined]}>
        <TouchableOpacity
          style={styles.questionCardHeader}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <View style={styles.questionCardHeaderLeft}>
            <Text style={styles.questionCardNumber}>Q{index + 1}</Text>
            <View style={styles.questionCardBadge}>
              <Text style={styles.questionCardBadgeText}>{questionTypeLabel}</Text>
            </View>
            <Text style={styles.questionCardPoints}>{question.points}pt</Text>
          </View>
          <View style={styles.questionCardHeaderRight}>
            {hasError && (
              <View style={styles.errorBadge}>
                <Ionicons name="alert-circle" size={16} color={Colors.accentRed} />
              </View>
            )}
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.primary}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <Animated.View style={[styles.questionCardBody, animatedStyle]}>
            {/* Question Text */}
            <View style={styles.fieldWrap}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Question Text</Text>
                <Text style={[styles.charCounter, charCount > 500 && styles.charCounterOver]}>
                  {charCount}/500
                </Text>
              </View>
              <TextInput
                style={[
                  styles.fieldInput,
                  styles.fieldInputMulti,
                  validationErrors[`question_${index}_text`] ? styles.fieldInputError : undefined,
                ]}
                value={question.question_text}
                onChangeText={(text) => {
                  if (text.length <= 500) {
                    setCharCount(text.length);
                    onUpdate({ ...question, question_text: text });
                  }
                }}
                placeholder="Enter your question..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
              {validationErrors[`question_${index}_text`] && (
                <Text style={styles.errorText}>{validationErrors[`question_${index}_text`]}</Text>
              )}
            </View>

            {/* Question Type Selector */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Question Type</Text>
              <SegmentedControl
                options={[
                  { label: 'Multiple Choice', value: 'multiple_choice' as QuestionType },
                  { label: 'True/False', value: 'true_false' as QuestionType },
                  { label: 'Essay', value: 'essay' as QuestionType },
                ]}
                value={question.question_type}
                onValueChange={handleTypeChange}
              />
            </View>

            {/* Points */}
            <Stepper
              label="Points"
              value={question.points}
              onValueChange={(val) => onUpdate({ ...question, points: val })}
              min={1}
              max={100}
            />

            {/* Choices for Multiple Choice and True/False */}
            {question.question_type === 'multiple_choice' && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Answer Choices</Text>
                <Text style={styles.fieldHint}>Tap a choice to mark it as correct</Text>
                {question.choices.map((choice, cIdx) => (
                  <View key={choice.id} style={styles.choiceRow}>
                    <TouchableOpacity
                      style={[
                        styles.choiceCorrectBtn,
                        choice.is_correct && styles.choiceCorrectBtnActive,
                      ]}
                      onPress={() => handleChoiceTap(cIdx)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={choice.is_correct ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={choice.is_correct ? '#FFFFFF' : '#CBD5E1'}
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={[
                        styles.choiceInput,
                        choice.is_correct && styles.choiceInputCorrect,
                      ]}
                      value={choice.choice_text}
                      onChangeText={(text) => updateChoiceText(cIdx, text)}
                      placeholder={`Choice ${cIdx + 1}`}
                      placeholderTextColor="#9CA3AF"
                    />
                    {question.choices.length > 2 && (
                      <TouchableOpacity
                        style={styles.removeChoiceBtn}
                        onPress={() => removeChoice(cIdx)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {question.choices.length < 6 && (
                  <TouchableOpacity
                    style={styles.addChoiceBtn}
                    onPress={addChoice}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.addChoiceBtnText}>Add Choice</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {question.question_type === 'true_false' && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Correct Answer</Text>
                <View style={styles.trueFalseRow}>
                  <TouchableOpacity
                    style={[
                      styles.trueFalseBtn,
                    question.choices[0]?.is_correct && styles.trueFalseBtnActive,
                    ]}
                    onPress={() => handleChoiceTap(0)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={question.choices[0]?.is_correct ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={question.choices[0]?.is_correct ? '#FFFFFF' : Colors.primary}
                    />
                    <Text style={[
                      styles.trueFalseBtnText,
                      question.choices[0]?.is_correct && styles.trueFalseBtnTextActive,
                    ]}>
                      True
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.trueFalseBtn,
                    question.choices[1]?.is_correct && styles.trueFalseBtnActive,
                    ]}
                    onPress={() => handleChoiceTap(1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={question.choices[1]?.is_correct ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={question.choices[1]?.is_correct ? '#FFFFFF' : Colors.primary}
                    />
                    <Text style={[
                      styles.trueFalseBtnText,
                      question.choices[1]?.is_correct && styles.trueFalseBtnTextActive,
                    ]}>
                      False
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {question.question_type === 'essay' && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Rubric / Notes (Optional)</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputMulti]}
                  value={question.rubric || ''}
                  onChangeText={(text) => onUpdate({ ...question, rubric: text })}
                  placeholder="Add grading notes or rubric criteria..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Delete button */}
            <TouchableOpacity
              style={styles.deleteQuestionBtn}
              onPress={onDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.accentRed} />
              <Text style={styles.deleteQuestionBtnText}>Delete Question</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </Swipeable>
  );
}

// Summary Bar component
function SummaryBar({
  questionCount,
  totalPoints,
  timeLimit,
}: {
  questionCount: number;
  totalPoints: number;
  timeLimit: number;
}) {
  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{questionCount}</Text>
        <Text style={styles.summaryLabel}>Questions</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalPoints}</Text>
        <Text style={styles.summaryLabel}>Points</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{timeLimit}m</Text>
        <Text style={styles.summaryLabel}>Time Limit</Text>
      </View>
    </View>
  );
}

// Progress Steps component
function ProgressSteps({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <View style={styles.progressSteps}>
      <View style={styles.progressStep}>
        <View style={[styles.progressStepCircle, currentStep >= 1 && styles.progressStepCircleActive]}>
          <Text style={[styles.progressStepNumber, currentStep >= 1 && styles.progressStepNumberActive]}>1</Text>
        </View>
        <Text style={[styles.progressStepLabel, currentStep >= 1 && styles.progressStepLabelActive]}>Settings</Text>
      </View>
      <View style={styles.progressLine}>
        <View style={[styles.progressLineFill, currentStep >= 2 && styles.progressLineFillActive]} />
      </View>
      <View style={styles.progressStep}>
        <View style={[styles.progressStepCircle, currentStep >= 2 && styles.progressStepCircleActive]}>
          <Text style={[styles.progressStepNumber, currentStep >= 2 && styles.progressStepNumberActive]}>2</Text>
        </View>
        <Text style={[styles.progressStepLabel, currentStep >= 2 && styles.progressStepLabelActive]}>Questions</Text>
      </View>
    </View>
  );
}

// Generate unique ID
const generateId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

// Main component
export function QuickQuizBuilderModal({
  visible,
  onClose,
  onCreate,
  modules,
  isCreating = false,
}: QuickQuizBuilderModalProps) {
  // Step state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Quiz settings state
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [weeklyModuleId, setWeeklyModuleId] = useState<string | null>(null);
  const [attemptLimit, setAttemptLimit] = useState(1);
  const [timeLimit, setTimeLimit] = useState(30);
  const [hasOpenAt, setHasOpenAt] = useState(false);
  const [openAt, setOpenAt] = useState(new Date());
  const [hasCloseAt, setHasCloseAt] = useState(false);
  const [closeAt, setCloseAt] = useState(new Date(Date.now() + 60 * 60 * 1000));

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Date picker state
  const [openPickerVisible, setOpenPickerVisible] = useState(false);
  const [closePickerVisible, setClosePickerVisible] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentStep(1);
      setTitle('');
      setInstructions('');
      setWeeklyModuleId(null);
      setAttemptLimit(1);
      setTimeLimit(30);
      setHasOpenAt(false);
      setHasCloseAt(false);
      setQuestions([]);
      setExpandedQuestionId(null);
      setValidationErrors({});
    }
  }, [visible]);

  // Calculate total points
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

  // Add new question
  const addQuestion = () => {
    const newQuestion: Question = {
      id: generateId(),
      question_text: '',
      question_type: 'multiple_choice',
      points: 1,
      choices: [
        { id: generateId(), choice_text: '', is_correct: true },
        { id: generateId(), choice_text: '', is_correct: false },
        { id: generateId(), choice_text: '', is_correct: false },
        { id: generateId(), choice_text: '', is_correct: false },
      ],
    };
    setQuestions(prev => [...prev, newQuestion]);
    setExpandedQuestionId(newQuestion.id);
  };

  // Update question
  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  // Delete question
  const deleteQuestion = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setQuestions(prev => prev.filter(q => q.id !== id));
    if (expandedQuestionId === id) {
      setExpandedQuestionId(null);
    }
  };

  // Validation
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Quiz title is required';
    }

    if (hasOpenAt && hasCloseAt && closeAt <= openAt) {
      errors.dates = 'Close date must be after open date';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};

    if (questions.length === 0) {
      errors.questions = 'Add at least one question';
    }

    questions.forEach((q, idx) => {
      if (!q.question_text.trim()) {
        errors[`question_${idx}_text`] = 'Question text is required';
      }

      if (q.question_type !== 'essay') {
        const hasCorrectChoice = q.choices.some(c => c.is_correct);
        if (!hasCorrectChoice) {
          errors[`question_${idx}_correct`] = 'Select a correct answer';
        }

        const hasEmptyChoice = q.choices.some(c => !c.choice_text.trim());
        if (hasEmptyChoice) {
          errors[`question_${idx}_choices`] = 'All choices must have text';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Navigation
  const goToNextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      setValidationErrors({});
    }
  };

  const goToPrevStep = () => {
    setCurrentStep(1);
    setValidationErrors({});
  };

  // Create quiz
  const handleCreate = async () => {
    if (!validateStep2()) return;

    try {
      await onCreate({
        title: title.trim(),
        instructions: instructions.trim(),
        weekly_module_id: weeklyModuleId,
        attempt_limit: attemptLimit,
        time_limit_minutes: timeLimit,
        open_at: hasOpenAt ? openAt : null,
        close_at: hasCloseAt ? closeAt : null,
        questions: questions.map((q, idx) => ({
          ...q,
          sort_order: idx,
        })),
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create quiz');
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Quiz Builder</Text>
          {currentStep === 2 ? (
            <TouchableOpacity
              onPress={handleCreate}
              disabled={isCreating}
              style={styles.headerBtn}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.createBtn}>Create</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <ProgressSteps currentStep={currentStep} />
        </View>

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 ? (
            <>
              {/* Step 1: Quiz Settings */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quiz Details</Text>

                {/* Title */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Quiz Title *</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      validationErrors.title ? styles.fieldInputError : undefined,
                    ]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter quiz title..."
                    placeholderTextColor="#9CA3AF"
                  />
                  {validationErrors.title && (
                    <Text style={styles.errorText}>{validationErrors.title}</Text>
                  )}
                </View>

                {/* Instructions */}
                <RichTextInput
                  label="Instructions"
                  value={instructions}
                  onChangeText={setInstructions}
                />

                {/* Week Topic */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Week Topic</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.topicPickerRow}
                  >
                    <TouchableOpacity
                      style={[styles.topicChip, !weeklyModuleId && styles.topicChipActive]}
                      onPress={() => setWeeklyModuleId(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.topicChipText, !weeklyModuleId && styles.topicChipTextActive]}>
                        Unassigned
                      </Text>
                    </TouchableOpacity>
                    {modules.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.topicChip, weeklyModuleId === m.id && styles.topicChipActive]}
                        onPress={() => setWeeklyModuleId(m.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.topicChipText, weeklyModuleId === m.id && styles.topicChipTextActive]}>
                          Week {m.week_number}: {m.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Attempt Limit Stepper */}
                <Stepper
                  label="Attempt Limit"
                  value={attemptLimit}
                  onValueChange={setAttemptLimit}
                  min={1}
                  max={10}
                />

                {/* Time Limit */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Time Limit (minutes)</Text>
                  <View style={styles.timeLimitRow}>
                    {[10, 15, 20, 30, 45, 60, 90].map((min) => {
                      const isActive = timeLimit === min;
                      return (
                        <TouchableOpacity
                          key={min}
                          style={[styles.timeChip, isActive && styles.timeChipActive]}
                          onPress={() => setTimeLimit(min)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.timeChipText, isActive && styles.timeChipTextActive]}>
                            {min}m
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Open/Close Dates */}
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionTitle}>Availability</Text>
                </View>

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setHasOpenAt(!hasOpenAt)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fieldLabel}>Set Open Date</Text>
                  <View style={[styles.toggleBadge, hasOpenAt && styles.toggleBadgeActive]}>
                    <Text style={[styles.toggleBadgeText, hasOpenAt && styles.toggleBadgeTextActive]}>
                      {hasOpenAt ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {hasOpenAt && (
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setOpenPickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                    <Text style={styles.datePickerBtnText}>Opens: {formatDate(openAt)}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setHasCloseAt(!hasCloseAt)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fieldLabel}>Set Close Date</Text>
                  <View style={[styles.toggleBadge, hasCloseAt && styles.toggleBadgeActive]}>
                    <Text style={[styles.toggleBadgeText, hasCloseAt && styles.toggleBadgeTextActive]}>
                      {hasCloseAt ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {hasCloseAt && (
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setClosePickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                    <Text style={styles.datePickerBtnText}>Closes: {formatDate(closeAt)}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}

                {validationErrors.dates && (
                  <Text style={styles.errorText}>{validationErrors.dates}</Text>
                )}
              </View>
            </>
          ) : (
            <>
              {/* Step 2: Questions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Questions</Text>

                {questions.length === 0 ? (
                  <View style={styles.emptyQuestions}>
                    <Ionicons name="help-circle-outline" size={48} color="#94A3B8" />
                    <Text style={styles.emptyQuestionsText}>No questions yet</Text>
                    <Text style={styles.emptyQuestionsSubtext}>
                      Tap the + button below to add your first question
                    </Text>
                  </View>
                ) : (
                  questions.map((q, idx) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={idx}
                      isExpanded={expandedQuestionId === q.id}
                      onToggle={() =>
                        setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)
                      }
                      onUpdate={(updates) => updateQuestion(q.id, updates)}
                      onDelete={() => deleteQuestion(q.id)}
                      validationErrors={validationErrors}
                    />
                  ))
                )}

                {validationErrors.questions && (
                  <Text style={styles.errorText}>{validationErrors.questions}</Text>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          {currentStep === 1 ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={goToNextStep}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>Next: Add Questions</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.step2Nav}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={goToPrevStep}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={18} color={Colors.primary} />
                <Text style={styles.backBtnText}>Settings</Text>
              </TouchableOpacity>
              <SummaryBar
                questionCount={questions.length}
                totalPoints={totalPoints}
                timeLimit={timeLimit}
              />
            </View>
          )}
        </View>

        {/* FAB for adding questions (Step 2 only) */}
        {currentStep === 2 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={addQuestion}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Date Pickers */}
        <DateTimePickerModal
          visible={openPickerVisible}
          value={openAt}
          onChange={(date) => {
            setOpenAt(date);
            setOpenPickerVisible(false);
          }}
          onClose={() => setOpenPickerVisible(false)}
          hasTime
        />
        <DateTimePickerModal
          visible={closePickerVisible}
          value={closeAt}
          onChange={(date) => {
            setCloseAt(date);
            setClosePickerVisible(false);
          }}
          onClose={() => setClosePickerVisible(false)}
          hasTime
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerBtn: {
    minWidth: 70,
  },
  cancelBtn: {
    fontSize: 16,
    color: '#5A6A85',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A3A6B',
  },
  createBtn: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
    textAlign: 'right',
  },

  // Progress steps
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressStepCircleActive: {
    backgroundColor: Colors.primary,
  },
  progressStepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  progressStepNumberActive: {
    color: '#FFFFFF',
  },
  progressStepLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  progressStepLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: Spacing.sm,
  },
  progressLineFill: {
    height: '100%',
    width: '0%',
    backgroundColor: Colors.primary,
  },
  progressLineFillActive: {
    width: '100%',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },

  // Sections
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: Spacing.md,
  },
  sectionDivider: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },

  // Fields
  fieldWrap: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  fieldInputMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldInputError: {
    borderColor: Colors.accentRed,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: Colors.accentRed,
    marginTop: 4,
  },

  // Character counter
  charCounter: {
    fontSize: 11,
    color: '#94A3B8',
  },
  charCounterOver: {
    color: Colors.accentRed,
    fontWeight: '600',
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  stepperValue: {
    minWidth: 50,
    alignItems: 'center',
  },
  stepperValueText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.md,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Topic chips
  topicPickerRow: {
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  topicChip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  topicChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  topicChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  topicChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Time limit
  timeLimitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timeChip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  timeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: Spacing.sm,
  },
  toggleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
  },
  toggleBadgeActive: {
    backgroundColor: Colors.primary + '20',
  },
  toggleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBadgeTextActive: {
    color: Colors.primary,
  },

  // Date picker
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary + '08',
    marginBottom: Spacing.sm,
  },
  datePickerBtnText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary,
    marginHorizontal: Spacing.sm,
    fontWeight: '500',
  },

  // Question cards
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  questionCardError: {
    borderColor: Colors.accentRed,
    borderWidth: 2,
  },
  questionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  questionCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  questionCardNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  questionCardBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  questionCardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  questionCardPoints: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  questionCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorBadge: {
    marginRight: Spacing.xs,
  },
  questionCardBody: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: Spacing.md,
  },

  // Choices
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  choiceCorrectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCorrectBtnActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  choiceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  choiceInputCorrect: {
    borderColor: Colors.success,
    backgroundColor: '#F0FDF4',
  },
  removeChoiceBtn: {
    padding: 4,
  },
  addChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  addChoiceBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  // True/False
  trueFalseRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  trueFalseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  trueFalseBtnActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  trueFalseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  trueFalseBtnTextActive: {
    color: '#FFFFFF',
  },

  // Delete question
  deleteQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  deleteQuestionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accentRed,
  },

  // Swipe delete
  deleteAction: {
    backgroundColor: Colors.accentRed,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: Radius.md,
    marginLeft: Spacing.sm,
  },

  // Empty state
  emptyQuestions: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyQuestionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: Spacing.md,
  },
  emptyQuestionsSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '08',
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  // Bottom navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...Shadows.sm,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  step2Nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
});
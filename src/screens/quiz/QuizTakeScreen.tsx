import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { QuestionRenderer } from '@/components/quiz/QuestionRenderer';
import { Colors } from '@/constants/colors';

interface QuizData {
  id: string;
  title: string;
  instructions?: string;
  time_limit_minutes?: number;
  questions: Array<{
    id: string;
    question_text: string;
    question_type: string;
    points: number;
    choices?: Array<{ id: string; choice_text: string }>;
  }>;
  attempt_id?: string;
  time_remaining?: number;
}

interface QuizAttemptData {
  attempt_id: string;
  quiz: QuizData;
  time_remaining?: number;
  answers?: Record<string, any>;
}

export default function QuizTakeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmittedRef = useRef(false);

  // Start/Resume quiz attempt
  const {
    isLoading,
    error,
    data: quizData,
  } = useQuery<QuizAttemptData>({
    queryKey: ['quiz-attempt', id],
    queryFn: async () => {
      const response = await api.post(`/quizzes/${id}/start/`);
      return response as QuizAttemptData;
    },
    enabled: !!id,
    retry: false,
    staleTime: 0,
  });

  // Initialize state when data loads
  useEffect(() => {
    if (quizData) {
      setAttemptId(quizData.attempt_id);
      setQuiz(quizData.quiz);
      if (quizData.time_remaining !== undefined && quizData.time_remaining !== null) {
        setTimeRemaining(quizData.time_remaining);
      }
      if (quizData.answers) {
        setAnswers(quizData.answers);
      }
    }
  }, [quizData]);

  // Auto-submit when timer expires
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error('No attempt in progress');
      return api.post(`/quizzes/${id}/submit/`, {
        attempt_id: attemptId,
        answers,
      });
    },
    onSuccess: (response) => {
      hasSubmittedRef.current = true;
      const data = response as { score: number; max_score: number };
      queryClient.invalidateQueries({ queryKey: ['quiz', id] });
      queryClient.invalidateQueries({ queryKey: ['quiz-attempt', id] });
      Alert.alert(
        'Quiz Submitted',
        `Your score: ${data.score}/${data.max_score}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to submit quiz');
    },
  });

  // Handle auto-submit when timer expires
  const handleAutoSubmit = useCallback(() => {
    if (attemptId && !submitMutation.isPending && !hasSubmittedRef.current) {
      submitMutation.mutate();
    }
  }, [attemptId, submitMutation]);

  // Timer effect with useRef to avoid stale closures
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Auto-submit when timer expires
          setTimeout(() => handleAutoSubmit(), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeRemaining !== null, handleAutoSubmit]);

  // Auto-save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) return;
      return api.post(`/quizzes/${id}/save-progress/`, {
        attempt_id: attemptId,
        answers,
      });
    },
  });

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(answers).length > 0 && attemptId) {
        saveMutation.mutate();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [answers, attemptId]);

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    const unansweredCount = quiz?.questions?.filter((q) => !answers[q.id]).length ?? 0;

    const doSubmit = () => {
      submitMutation.mutate();
    };

    if (unansweredCount > 0) {
      Alert.alert(
        'Unanswered Questions',
        `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Are you sure you want to submit?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Anyway', style: 'destructive', onPress: doSubmit },
        ]
      );
    } else {
      Alert.alert(
        'Submit Quiz',
        'Are you sure you want to submit? You cannot change your answers after submission.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: doSubmit },
        ]
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="bg-blue-600 px-4 flex-row items-center" style={{ paddingTop: Platform.OS === 'ios' ? 8 : 16, paddingBottom: 16 }}>
          <TouchableOpacity className="p-1 -ml-1 mr-2" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">Quiz</Text>
        </View>
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text className="text-lg font-bold text-gray-800 mt-3 text-center">
            Failed to load quiz
          </Text>
          <Text className="text-sm text-gray-600 mt-2 text-center">
            Please try again later
          </Text>
          <TouchableOpacity className="mt-4 py-3 px-6 bg-blue-600 rounded-lg" onPress={() => router.back()}>
            <Text className="text-base font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state
  if (isLoading || !quiz) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="bg-blue-600 px-4 flex-row items-center" style={{ paddingTop: Platform.OS === 'ios' ? 8 : 16, paddingBottom: 16 }}>
          <TouchableOpacity className="p-1 -ml-1 mr-2" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">Quiz</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="mt-3 text-sm text-gray-600">
            Loading quiz...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-600 px-4 flex-row items-center" style={{ paddingTop: Platform.OS === 'ios' ? 8 : 16, paddingBottom: 16 }}>
        <TouchableOpacity
          className="p-1 -ml-1 mr-2"
          onPress={() => {
            Alert.alert(
              'Leave Quiz?',
              'Your progress will be saved, but the timer will continue running.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: () => router.back() },
              ]
            );
          }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-white flex-1 mr-2" numberOfLines={1}>
            {quiz.title}
          </Text>
          {timeRemaining !== null && (
            <Text className={`text-lg font-bold font-mono ${timeRemaining < 60 ? 'text-red-300' : 'text-white'}`}>
              {formatTime(timeRemaining)}
            </Text>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-sm font-medium text-gray-600">
            Question {currentIndex + 1} of {totalQuestions}
          </Text>
          <Text className="text-xs font-semibold text-gray-500">
            {currentQuestion?.points ?? 0} pts
          </Text>
        </View>
        <View className="h-1 rounded-full bg-gray-200 overflow-hidden">
          <View
            className="h-full bg-blue-600 rounded-full"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </View>
      </View>

      {/* Question */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {currentQuestion && (
          <View className="rounded-xl p-4 border bg-white border-gray-200">
            <QuestionRenderer
              question={currentQuestion}
              answer={answers[currentQuestion.id]}
              onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            />
          </View>
        )}

        {/* Question Navigator */}
        <View className="mt-4">
          <Text className="text-xs font-semibold mb-2 uppercase tracking-wide text-gray-600">
            Questions
          </Text>
          <View className="flex-row flex-wrap gap-1">
            {quiz.questions.map((q, index) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = index === currentIndex;
              return (
                <TouchableOpacity
                  key={q.id}
                  className={`w-10 h-10 rounded-md items-center justify-center border ${
                    isCurrent
                      ? 'bg-blue-600 border-blue-600'
                      : isAnswered
                      ? 'bg-green-600 border-green-600'
                      : 'bg-white border-gray-200'
                  }`}
                  onPress={() => setCurrentIndex(index)}
                  accessibilityLabel={`Question ${index + 1}${isAnswered ? ', answered' : ', unanswered'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent }}
                >
                  <Text className={`text-sm font-semibold ${isCurrent || isAnswered ? 'text-white' : 'text-gray-800'}`}>
                    {index + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Navigation Footer */}
      <View className="flex-row items-center justify-between px-4 py-3 border-t bg-white border-gray-200" style={{ paddingBottom: Platform.OS === 'ios' ? 24 : 12 }}>
        <TouchableOpacity
          className={`flex-row items-center py-2 px-3 ${currentIndex === 0 ? 'opacity-50' : ''}`}
          onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          accessibilityLabel="Previous question"
          accessibilityRole="button"
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={currentIndex === 0 ? '#9CA3AF' : Colors.primary}
          />
          <Text className={`text-base font-semibold ml-1 ${currentIndex === 0 ? 'text-gray-400' : 'text-blue-600'}`}>
            Previous
          </Text>
        </TouchableOpacity>

        {isLastQuestion ? (
          <TouchableOpacity
            className={`flex-row items-center py-3 px-4 rounded-lg min-w-[120px] justify-center ${submitMutation.isPending ? 'opacity-70' : ''}`}
            style={{ backgroundColor: Colors.success }}
            onPress={handleSubmit}
            disabled={submitMutation.isPending}
            accessibilityLabel="Submit quiz"
            accessibilityRole="button"
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text className="text-base font-bold text-white mr-1">Submit</Text>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="flex-row items-center py-3 px-4 rounded-lg bg-blue-600"
            onPress={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
            accessibilityLabel="Next question"
            accessibilityRole="button"
          >
            <Text className="text-base font-semibold text-white mr-1">Next</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
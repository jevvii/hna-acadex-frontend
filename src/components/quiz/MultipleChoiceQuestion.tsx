import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  question: {
    id: string;
    question_text: string;
    choices?: Array<{ id: string; choice_text: string }>;
  };
  answer: string | null;
  onAnswer: (answer: string) => void;
}

export function MultipleChoiceQuestion({ question, answer, onAnswer }: Props) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-800 mb-4 leading-6">
        {question.question_text}
      </Text>
      {question.choices?.map((choice) => {
        const isSelected = answer === choice.id;
        return (
          <TouchableOpacity
            key={choice.id}
            onPress={() => onAnswer(choice.id)}
            accessibilityLabel={`Option: ${choice.choice_text}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            className={`p-4 rounded-lg mb-2 border ${
              isSelected
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-gray-200'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`text-base font-medium ${isSelected ? 'text-white' : 'text-gray-800'}`}>
              {choice.choice_text}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
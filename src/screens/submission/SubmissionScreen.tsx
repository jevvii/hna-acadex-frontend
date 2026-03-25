import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Activity {
  id: string;
  title: string;
  description: string;
  due_at: string;
  max_score: number;
  activity_type: string;
  allowed_file_types: string;
  attempts_allowed: number;
  my_submission?: {
    id: string;
    file_urls: string[];
    submitted_at: string;
    score?: number;
    attempt_number: number;
  };
}

export default function SubmissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<any[]>([]);

  // Fetch activity details
  const { data: activity, isLoading } = useQuery<Activity>({
    queryKey: ['activity', id],
    queryFn: async () => {
      const response = await api.get(`/activities/${id}/`);
      return response.data;
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('files', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        } as any);
      });
      return api.post(`/activities/${id}/submit/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', id] });
      Alert.alert('Success', 'Assignment submitted successfully!');
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to submit assignment');
    },
  });

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const maxSize = 10 * 1024 * 1024; // 10MB

        for (const asset of result.assets) {
          if (asset.size && asset.size > maxSize) {
            Alert.alert('Error', `${asset.name} exceeds 10MB limit`);
            continue;
          }
          setFiles(prev => [...prev, asset]);
        }
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      Alert.alert('Error', 'Please select at least one file');
      return;
    }
    Alert.alert(
      'Submit Assignment',
      'Are you sure you want to submit?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => submitMutation.mutate() },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const existingSubmission = activity?.my_submission;
  const attemptsRemaining = activity?.attempts_allowed
    ? activity.attempts_allowed - (existingSubmission?.attempt_number || 0)
    : null;

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      {/* Activity Info */}
      <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
        <Text className="text-xl font-bold text-gray-800">{activity?.title}</Text>
        <Text className="text-gray-600 mt-2">{activity?.description}</Text>
        <View className="flex-row justify-between mt-4">
          <Text className="text-sm text-gray-500">
            Due: {new Date(activity?.due_at || '').toLocaleDateString()}
          </Text>
          <Text className="text-sm text-gray-500">
            Max Score: {activity?.max_score}
          </Text>
        </View>
        {attemptsRemaining !== null && (
          <Text className="text-sm text-blue-600 mt-2">
            Attempts remaining: {attemptsRemaining}
          </Text>
        )}
      </View>

      {/* Existing Submission */}
      {existingSubmission && (
        <View className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
          <Text className="text-lg font-semibold text-blue-800">Submitted</Text>
          <Text className="text-sm text-blue-600 mt-1">
            Submitted at: {new Date(existingSubmission.submitted_at).toLocaleString()}
          </Text>
          {existingSubmission.score !== undefined && (
            <Text className="text-sm text-blue-600">
              Score: {existingSubmission.score}/{activity?.max_score}
            </Text>
          )}
          {existingSubmission.file_urls.map((url, index) => (
            <Text key={index} className="text-sm text-blue-500 mt-1">
              📎 {url.split('/').pop()}
            </Text>
          ))}
        </View>
      )}

      {/* File Upload Section */}
      <View className="bg-white rounded-xl p-4 shadow-sm">
        <Text className="text-lg font-semibold text-gray-800 mb-3">Upload Files</Text>

        {/* Selected Files */}
        {files.map((file, index) => (
          <View key={index} className="flex-row items-center bg-gray-100 rounded-lg p-3 mb-2">
            <Text className="flex-1 text-gray-700" numberOfLines={1}>{file.name}</Text>
            <TouchableOpacity onPress={() => removeFile(index)}>
              <Text className="text-red-500 ml-2">✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          onPress={pickDocument}
          className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl p-4 items-center mt-2"
        >
          <Text className="text-blue-600">+ Add File</Text>
        </TouchableOpacity>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={files.length === 0 || submitMutation.isPending}
        className={`mt-4 py-4 rounded-xl items-center ${
          files.length === 0 ? 'bg-gray-300' : 'bg-blue-600'
        }`}
      >
        {submitMutation.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold">Submit Assignment</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
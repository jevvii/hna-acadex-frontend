import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Colors, Radius, Shadows, Spacing } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type DisplayMode = 'page' | 'slide' | 'scroll';

export type TocItem = {
  id: string;
  title: string;
  page: number;
  level: number;
};

type Annotation = {
  id: string;
  text: string;
  createdAt: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  rawUrl: string | null;
  previewUrl?: string | null;
  fileName?: string;
  breadcrumb?: string;
  canAnnotate?: boolean;
  totalPages?: number;
  initialPage?: number;
  tocItems?: TocItem[];
  onOpenOutside?: (url: string) => void;
};

const OFFICE_EXT = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];

function extFrom(value?: string | null) {
  if (!value) return '';
  const clean = value.split('?')[0].split('#')[0];
  return (clean.split('.').pop() || '').toLowerCase();
}

function officeViewerUrl(url: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

function isPrivateOrLocalHttpUrl(value?: string | null) {
  if (!value) return false;
  try {
    const u = new URL(value);
    const host = (u.hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (/^10\./.test(host)) return true;
    if (/^192\.168\./.test(host)) return true;
    const match172 = host.match(/^172\.(\d+)\./);
    if (match172) {
      const second = Number(match172[1]);
      if (second >= 16 && second <= 31) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Skeleton loader component
function SkeletonLoader() {
  const shimmerValue = useSharedValue(0);

  shimmerValue.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
    ),
    -1,
    false
  );

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerValue.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonBanner, shimmerStyle]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonLine, styles.skeletonLineLarge, shimmerStyle]} />
        <Animated.View style={[styles.skeletonLine, styles.skeletonLineMedium, shimmerStyle]} />
        <Animated.View style={[styles.skeletonLine, styles.skeletonLineSmall, shimmerStyle]} />
        <View style={styles.skeletonSpacing} />
        <Animated.View style={[styles.skeletonLine, styles.skeletonLineLarge, shimmerStyle]} />
        <Animated.View style={[styles.skeletonLine, styles.skeletonLineMedium, shimmerStyle]} />
      </View>
    </View>
  );
}

// Empty state component
function EmptyState({
  isOffice,
  privateHost,
  onOpenOutside,
  rawUrl
}: {
  isOffice: boolean;
  privateHost: boolean;
  onOpenOutside?: (url: string) => void;
  rawUrl?: string | null;
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="document-text-outline" size={64} color={Colors.light.mutedForeground} />
      </View>
      <Text style={styles.emptyTitle}>Preview Unavailable</Text>
      <Text style={styles.emptySubtitle}>
        {isOffice && privateHost
          ? 'This Office file is hosted privately and cannot be previewed.'
          : 'This document cannot be displayed in the app.'}
      </Text>
      {rawUrl && (
        <TouchableOpacity
          style={styles.emptyCtaButton}
          onPress={() => onOpenOutside?.(rawUrl)}
          activeOpacity={0.7}
        >
          <Ionicons name="open-outline" size={18} color={Colors.primary} />
          <Text style={styles.emptyCtaText}>Open in External App</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Floating page indicator pill
function PageIndicator({
  currentPage,
  totalPages,
  visible
}: {
  currentPage: number;
  totalPages: number;
  visible: boolean;
}) {
  const opacity = useSharedValue(visible ? 1 : 0);
  const scale = useSharedValue(visible ? 1 : 0.8);

  opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  scale.value = withSpring(visible ? 1 : 0.8, { damping: 15 });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (totalPages <= 0) return null;

  return (
    <Animated.View style={[styles.pageIndicatorPill, animatedStyle]}>
      <Text style={styles.pageIndicatorText}>
        {currentPage} / {totalPages}
      </Text>
    </Animated.View>
  );
}

// Zoom controls component
function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitWidth,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
}) {
  return (
    <View style={styles.zoomControls}>
      <TouchableOpacity style={styles.zoomBtn} onPress={onZoomOut} activeOpacity={0.6}>
        <Ionicons name="remove-outline" size={18} color={Colors.light.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.zoomText}>{zoom}%</Text>
      <TouchableOpacity style={styles.zoomBtn} onPress={onZoomIn} activeOpacity={0.6}>
        <Ionicons name="add-outline" size={18} color={Colors.light.textSecondary} />
      </TouchableOpacity>
      <View style={styles.zoomDivider} />
      <TouchableOpacity style={styles.zoomBtn} onPress={onFitWidth} activeOpacity={0.6}>
        <Text style={styles.zoomBtnText}>Fit</Text>
      </TouchableOpacity>
    </View>
  );
}

// Bottom sheet component for TOC/Annotations
function BottomSheet({
  visible,
  onClose,
  activeTab,
  onTabChange,
  tocItems,
  annotations,
  canAnnotate,
  onAddAnnotation,
  onPageSelect,
}: {
  visible: boolean;
  onClose: () => void;
  activeTab: 'toc' | 'annotations';
  onTabChange: (tab: 'toc' | 'annotations') => void;
  tocItems: TocItem[];
  annotations: Annotation[];
  canAnnotate: boolean;
  onAddAnnotation: (text: string) => void;
  onPageSelect: (page: number) => void;
}) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [annotationInput, setAnnotationInput] = useState('');
  const [annotationFilter, setAnnotationFilter] = useState('');

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 100 });
      backdropOpacity.value = withTiming(0.4, { duration: 200 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const filteredAnnotations = annotations.filter((a) =>
    a.text.toLowerCase().includes(annotationFilter.trim().toLowerCase()),
  );

  const handleAddAnnotation = () => {
    if (annotationInput.trim()) {
      onAddAnnotation(annotationInput.trim());
      setAnnotationInput('');
    }
  };

  return (
    <>
      <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.bottomSheet, sheetStyle]} pointerEvents={visible ? 'auto' : 'none'}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetTabs}>
          <TouchableOpacity
            style={[styles.sheetTab, activeTab === 'toc' && styles.sheetTabActive]}
            onPress={() => onTabChange('toc')}
            activeOpacity={0.6}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={activeTab === 'toc' ? Colors.primary : Colors.light.textSecondary}
            />
            <Text style={[styles.sheetTabText, activeTab === 'toc' && styles.sheetTabTextActive]}>
              Outline
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sheetTab, activeTab === 'annotations' && styles.sheetTabActive]}
            onPress={() => onTabChange('annotations')}
            activeOpacity={0.6}
          >
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={activeTab === 'annotations' ? Colors.primary : Colors.light.textSecondary}
            />
            <Text style={[styles.sheetTabText, activeTab === 'annotations' && styles.sheetTabTextActive]}>
              Comments
            </Text>
            {annotations.length > 0 && (
              <View style={styles.annotationBadge}>
                <Text style={styles.annotationBadgeText}>{annotations.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sheetContent}>
          {activeTab === 'toc' ? (
            tocItems.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {tocItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.tocItem, { paddingLeft: 16 + item.level * 12 }]}
                    onPress={() => {
                      onPageSelect(item.page);
                      onClose();
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.tocItemText} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.tocItemPage}>{item.page}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptySheetState}>
                <Ionicons name="list-outline" size={32} color={Colors.light.mutedForeground} />
                <Text style={styles.emptySheetText}>No outline available</Text>
                <Text style={styles.emptySheetHint}>
                  This document doesn't have a table of contents.
                </Text>
              </View>
            )
          ) : (
            <View style={{ flex: 1 }}>
              {canAnnotate && (
                <View style={styles.annotationInputRow}>
                  <TextInput
                    style={styles.annotationInput}
                    value={annotationInput}
                    onChangeText={setAnnotationInput}
                    placeholder="Add a comment..."
                    placeholderTextColor={Colors.light.mutedForeground}
                  />
                  <TouchableOpacity
                    style={[styles.annotationAddBtn, !annotationInput.trim() && styles.annotationAddBtnDisabled]}
                    onPress={handleAddAnnotation}
                    disabled={!annotationInput.trim()}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              {!canAnnotate && (
                <View style={styles.teacherOnlyNote}>
                  <Ionicons name="lock-closed-outline" size={14} color={Colors.light.mutedForeground} />
                  <Text style={styles.teacherOnlyNoteText}>Only teachers can add comments</Text>
                </View>
              )}
              {annotations.length > 0 && (
                <TextInput
                  style={styles.annotationFilter}
                  value={annotationFilter}
                  onChangeText={setAnnotationFilter}
                  placeholder="Search comments..."
                  placeholderTextColor={Colors.light.mutedForeground}
                />
              )}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {filteredAnnotations.map((a) => (
                  <View key={a.id} style={styles.annotationItem}>
                    <Text style={styles.annotationText}>{a.text}</Text>
                    <Text style={styles.annotationMeta}>
                      {new Date(a.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
                {filteredAnnotations.length === 0 && annotations.length > 0 && (
                  <Text style={styles.noMatchText}>No matching comments</Text>
                )}
                {annotations.length === 0 && (
                  <View style={styles.emptySheetState}>
                    <Ionicons name="chatbubble-outline" size={32} color={Colors.light.mutedForeground} />
                    <Text style={styles.emptySheetText}>No comments yet</Text>
                    {canAnnotate && (
                      <Text style={styles.emptySheetHint}>Be the first to add a comment.</Text>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </Animated.View>
    </>
  );
}

export function DocumentViewerModal({
  visible,
  onClose,
  rawUrl,
  previewUrl,
  fileName,
  breadcrumb,
  canAnnotate,
  onOpenOutside,
  tocItems: tocItemsProp = [],
  totalPages: totalPagesProp = 1,
  initialPage = 1,
}: Props) {
  const insets = useSafeAreaInsets();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('page');
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(true);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetTab, setBottomSheetTab] = useState<'toc' | 'annotations'>('toc');
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Use props with defaults
  const totalPages = totalPagesProp;
  const tocItems = tocItemsProp;

  // Animation values
  const toolbarTranslateY = useSharedValue(0);

  const name = fileName || 'Document';
  const ext = extFrom(fileName || rawUrl);
  const isPdf = ext === 'pdf';
  const isOffice = OFFICE_EXT.includes(ext);
  const privateHost = isPrivateOrLocalHttpUrl(rawUrl);
  const canUseCloudOfficeViewer = isOffice && !privateHost;

  const viewerUrl = useMemo(() => {
    if (!rawUrl) return null;
    if (canUseCloudOfficeViewer) return officeViewerUrl(rawUrl);
    if (isPdf) return rawUrl;
    if (isOffice && privateHost) {
      if (previewUrl) return previewUrl;
      return null;
    }
    return rawUrl;
  }, [rawUrl, previewUrl, canUseCloudOfficeViewer, isOffice, isPdf, privateHost]);

  const hasError = !viewerUrl;

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 25, 300));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 25, 50));
  }, []);

  const handleFitWidth = useCallback(() => {
    setZoom(100);
  }, []);

  // Page navigation
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Add annotation
  const addAnnotation = useCallback((text: string) => {
    setAnnotations((prev) => [
      { id: String(Date.now()), text, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  // Loading simulation
  React.useEffect(() => {
    if (visible && viewerUrl) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 1500);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [visible, viewerUrl]);

  const toolbarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toolbarTranslateY.value }],
  }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.6}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
            <Text style={styles.closeText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            {breadcrumb && (
              <Text style={styles.breadcrumb} numberOfLines={1}>
                {breadcrumb}
              </Text>
            )}
            <Text style={styles.title} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => setShowBottomSheet(true)}
            activeOpacity={0.6}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Main content */}
        <View style={styles.contentArea}>
          {isLoading && viewerUrl ? (
            <SkeletonLoader />
          ) : hasError ? (
            <EmptyState
              isOffice={isOffice}
              privateHost={privateHost}
              onOpenOutside={onOpenOutside}
              rawUrl={rawUrl}
            />
          ) : (
            <View style={styles.viewerContainer}>
              <WebView
                source={{ uri: viewerUrl! }}
                style={styles.webview}
                javaScriptEnabled
                domStorageEnabled
              />
            </View>
          )}

          {/* Page indicator pill */}
          {!isLoading && !hasError && (
            <PageIndicator currentPage={currentPage} totalPages={totalPages} visible={isToolbarVisible} />
          )}
        </View>

        {/* Auto-hiding toolbar */}
        <Animated.View style={[styles.toolbar, toolbarAnimatedStyle]}>
          <View style={styles.toolbarRow}>
            <TouchableOpacity style={styles.toolBtn} onPress={prevPage} disabled={currentPage <= 1} activeOpacity={0.6}>
              <Ionicons
                name="chevron-back-outline"
                size={18}
                color={currentPage <= 1 ? Colors.light.mutedForeground : Colors.light.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={nextPage} disabled={currentPage >= totalPages} activeOpacity={0.6}>
              <Ionicons
                name="chevron-forward-outline"
                size={18}
                color={currentPage >= totalPages ? Colors.light.mutedForeground : Colors.light.textSecondary}
              />
            </TouchableOpacity>
            <View style={styles.toolbarDivider} />
            <TouchableOpacity
              style={[styles.displayModeBtn, displayMode === 'page' && styles.displayModeBtnActive]}
              onPress={() => setDisplayMode('page')}
              activeOpacity={0.6}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={displayMode === 'page' ? Colors.primary : Colors.light.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.displayModeBtn, displayMode === 'slide' && styles.displayModeBtnActive]}
              onPress={() => setDisplayMode('slide')}
              activeOpacity={0.6}
            >
              <Ionicons
                name="easel-outline"
                size={16}
                color={displayMode === 'slide' ? Colors.primary : Colors.light.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.displayModeBtn, displayMode === 'scroll' && styles.displayModeBtnActive]}
              onPress={() => setDisplayMode('scroll')}
              activeOpacity={0.6}
            >
              <Ionicons
                name="reader-outline"
                size={16}
                color={displayMode === 'scroll' ? Colors.primary : Colors.light.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.toolbarRow}>
            <ZoomControls
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFitWidth={handleFitWidth}
            />
            <View style={styles.toolbarSpacer} />
            <TouchableOpacity
              style={styles.tocBtn}
              onPress={() => setShowBottomSheet(true)}
              activeOpacity={0.6}
            >
              <Ionicons name="list-outline" size={18} color={Colors.primary} />
              <Text style={styles.tocBtnText}>Contents</Text>
            </TouchableOpacity>
            {rawUrl && (
              <TouchableOpacity
                style={styles.openOutsideBtn}
                onPress={() => onOpenOutside?.(rawUrl)}
                activeOpacity={0.6}
              >
                <Ionicons name="open-outline" size={16} color={Colors.primary} />
                <Text style={styles.openOutsideText}>Open</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Bottom sheet for TOC/Annotations */}
        <BottomSheet
          visible={showBottomSheet}
          onClose={() => setShowBottomSheet(false)}
          activeTab={bottomSheetTab}
          onTabChange={setBottomSheetTab}
          tocItems={tocItems}
          annotations={annotations}
          canAnnotate={canAnnotate || false}
          onAddAnnotation={addAnnotation}
          onPageSelect={(page) => {
            setCurrentPage(page);
            setShowBottomSheet(false);
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  breadcrumb: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    color: Colors.light.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  headerAction: {
    padding: Spacing.xs,
  },
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Skeleton styles
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    margin: Spacing.md,
    overflow: 'hidden',
  },
  skeletonBanner: {
    height: 120,
    backgroundColor: Colors.light.muted,
  },
  skeletonContent: {
    padding: Spacing.lg,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: Colors.light.muted,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  skeletonLineLarge: {
    width: '85%',
  },
  skeletonLineMedium: {
    width: '70%',
  },
  skeletonLineSmall: {
    width: '45%',
  },
  skeletonSpacing: {
    height: 24,
  },

  // Empty state styles
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.light.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    color: Colors.light.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyCtaText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  // Page indicator
  pageIndicatorPill: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
    backgroundColor: 'rgba(26, 58, 107, 0.9)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  pageIndicatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Toolbar styles
  toolbar: {
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
    ...Shadows.card,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toolBtn: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  toolbarDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.light.border,
    marginHorizontal: Spacing.sm,
  },
  displayModeBtn: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.light.muted,
  },
  displayModeBtnActive: {
    backgroundColor: Colors.primaryLight,
  },
  toolbarSpacer: {
    flex: 1,
  },

  // Zoom controls
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.muted,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  zoomBtn: {
    padding: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  zoomBtnText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  zoomText: {
    color: Colors.light.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 45,
    textAlign: 'center',
  },
  zoomDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.light.border,
    marginHorizontal: Spacing.xs,
  },

  // TOC button
  tocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.light.muted,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tocBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Open outside button (ghost style)
  openOutsideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  openOutsideText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Bottom sheet
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 100,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: SCREEN_HEIGHT * 0.7,
    zIndex: 101,
    ...Shadows.card,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    backgroundColor: Colors.light.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sheetTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: Spacing.md,
  },
  sheetTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sheetTabActive: {
    borderBottomColor: Colors.primary,
  },
  sheetTabText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  sheetTabTextActive: {
    color: Colors.primary,
  },
  annotationBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: Spacing.xs,
  },
  annotationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sheetContent: {
    flex: 1,
    padding: Spacing.md,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },

  // TOC styles
  tocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tocItemText: {
    color: Colors.light.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  tocItemPage: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Annotation styles
  annotationInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  annotationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.light.textPrimary,
    fontSize: 14,
    backgroundColor: Colors.light.muted,
  },
  annotationAddBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  annotationAddBtnDisabled: {
    opacity: 0.5,
  },
  annotationFilter: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.light.textPrimary,
    fontSize: 13,
    backgroundColor: Colors.light.muted,
    marginBottom: Spacing.md,
  },
  annotationItem: {
    backgroundColor: Colors.light.muted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  annotationText: {
    color: Colors.light.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  annotationMeta: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    marginTop: Spacing.xs,
  },
  teacherOnlyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.light.muted,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  teacherOnlyNoteText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  noMatchText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },

  // Empty sheet state
  emptySheetState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptySheetText: {
    color: Colors.light.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySheetHint: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    marginTop: Spacing.xs,
  },
});
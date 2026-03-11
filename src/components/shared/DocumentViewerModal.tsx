import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Colors, Radius, Shadows, Spacing } from '@/constants/colors';

type DisplayMode = 'page' | 'slide' | 'scroll';
type FitMode = 'width' | 'page' | null;

type Props = {
  visible: boolean;
  onClose: () => void;
  rawUrl: string | null;
  previewUrl?: string | null;
  fileName?: string;
  breadcrumb?: string;
  canAnnotate?: boolean;
  onOpenOutside?: (url: string) => void;
};

type Annotation = {
  id: string;
  text: string;
  createdAt: string;
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

export function DocumentViewerModal({
  visible,
  onClose,
  rawUrl,
  previewUrl,
  fileName,
  breadcrumb,
  canAnnotate,
  onOpenOutside,
}: Props) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('page');
  const [fitMode, setFitMode] = useState<FitMode>('width');
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [showThumbs, setShowThumbs] = useState(true);
  const [showToc, setShowToc] = useState(true);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationInput, setAnnotationInput] = useState('');
  const [annotationFilter, setAnnotationFilter] = useState('');

  const name = fileName || 'Document';
  const ext = extFrom(fileName || rawUrl);
  const isPdf = ext === 'pdf';
  const isOffice = OFFICE_EXT.includes(ext);
  const privateHost = isPrivateOrLocalHttpUrl(rawUrl);
  const canUseCloudOfficeViewer = isOffice && !privateHost;

  const viewerUrl = useMemo(() => {
    if (!rawUrl) return null;
    if (canUseCloudOfficeViewer) return officeViewerUrl(rawUrl);
    if (isPdf) {
      return rawUrl;
    }
    if (isOffice && privateHost) {
      if (previewUrl) return previewUrl;
      return null;
    }
    return rawUrl;
  }, [rawUrl, previewUrl, canUseCloudOfficeViewer, isOffice, isPdf, privateHost]);

  const filteredAnnotations = annotations.filter((a) =>
    a.text.toLowerCase().includes(annotationFilter.trim().toLowerCase()),
  );

  const addAnnotation = () => {
    const text = annotationInput.trim();
    if (!text) return;
    setAnnotations((prev) => [{ id: String(Date.now()), text, createdAt: new Date().toISOString() }, ...prev]);
    setAnnotationInput('');
  };

  const canPage = isPdf;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.breadcrumb} numberOfLines={1}>{breadcrumb || 'Course / Module / File'}</Text>
            <Text style={styles.title} numberOfLines={1}>{name}</Text>
          </View>
          <TouchableOpacity onPress={() => viewerUrl && onOpenOutside?.(viewerUrl)} disabled={!viewerUrl}>
            <Ionicons name="download-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setDisplayMode('page')}><Text style={[styles.toolText, displayMode === 'page' && styles.toolTextActive]}>Page</Text></TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setDisplayMode('slide')}><Text style={[styles.toolText, displayMode === 'slide' && styles.toolTextActive]}>Slide</Text></TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setDisplayMode('scroll')}><Text style={[styles.toolText, displayMode === 'scroll' && styles.toolTextActive]}>Scroll</Text></TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setZoom((v) => Math.max(50, v - 10))}><Ionicons name="remove-outline" size={16} color="#334155" /></TouchableOpacity>
          <Text style={styles.zoomText}>{zoom}%</Text>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setZoom((v) => Math.min(250, v + 10))}><Ionicons name="add-outline" size={16} color="#334155" /></TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setFitMode('width')}><Text style={styles.toolText}>Fit W</Text></TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setFitMode('page')}><Text style={styles.toolText}>Fit P</Text></TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setShowThumbs((v) => !v)}><Ionicons name="grid-outline" size={16} color="#334155" /></TouchableOpacity>
        </View>

        <View style={styles.contentRow}>
          {showThumbs && (
            <View style={styles.thumbCol}>
              <ScrollView contentContainerStyle={styles.thumbList}>
                {Array.from({ length: 12 }).map((_, idx) => {
                  const page = idx + 1;
                  return (
                    <TouchableOpacity
                      key={`thumb-${page}`}
                      style={[styles.thumbItem, currentPage === page && styles.thumbItemActive]}
                      onPress={() => canPage && setCurrentPage(page)}
                      disabled={!canPage}
                    >
                      <Text style={[styles.thumbText, currentPage === page && styles.thumbTextActive]}>{page}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.viewerCol}>
            <View style={styles.viewerCard}>
              {viewerUrl ? (
                <WebView
                  source={{ uri: viewerUrl }}
                  style={styles.webview}
                  startInLoadingState
                  javaScriptEnabled
                  domStorageEnabled
                />
              ) : (
                <View style={styles.emptyView}>
                  <Ionicons name="document-outline" size={36} color="#64748B" />
                  <Text style={styles.emptyText}>
                    {isOffice && privateHost
                      ? 'No generated in-app preview yet for this Office file.'
                      : 'No document URL'}
                  </Text>
                  <Text style={styles.emptyHint}>
                    {isOffice && privateHost
                      ? 'Ask teacher to re-upload and wait for preview processing, or use Open Outside.'
                      : 'Try opening outside instead.'}
                  </Text>
                  {!!rawUrl && (
                    <TouchableOpacity style={styles.fallbackOpenBtn} onPress={() => onOpenOutside?.(rawUrl)}>
                      <Text style={styles.fallbackOpenText}>Open Outside</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <View style={styles.pageCtrl}>
                <TouchableOpacity style={styles.toolBtn} onPress={() => canPage && setCurrentPage((v) => Math.max(1, v - 1))} disabled={!canPage}>
                  <Ionicons name="chevron-back-outline" size={16} color="#334155" />
                </TouchableOpacity>
                <Text style={styles.pageText}>{canPage ? `${currentPage}/12` : '-/-'}</Text>
                <TouchableOpacity style={styles.toolBtn} onPress={() => canPage && setCurrentPage((v) => v + 1)} disabled={!canPage}>
                  <Ionicons name="chevron-forward-outline" size={16} color="#334155" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.downloadBtn} onPress={() => viewerUrl && onOpenOutside?.(viewerUrl)} disabled={!viewerUrl}>
                <Ionicons name="download-outline" size={14} color="#FFFFFF" />
                <Text style={styles.downloadText}>Download</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showToc && (
            <View style={styles.sideCol}>
              <TouchableOpacity style={styles.sideHeader} onPress={() => setShowToc((v) => !v)}>
                <Text style={styles.sideTitle}>Table of Contents</Text>
                <Ionicons name="chevron-up-outline" size={14} color="#475569" />
              </TouchableOpacity>
              <Text style={styles.sideMuted}>{isPdf ? 'Pages 1-12' : 'Document outline unavailable'}</Text>

              <View style={styles.annHeaderRow}>
                <Text style={styles.sideTitle}>Annotations</Text>
              </View>
              {canAnnotate ? (
                <>
                  <TextInput
                    style={styles.annInput}
                    value={annotationInput}
                    onChangeText={setAnnotationInput}
                    placeholder="Add comment"
                    placeholderTextColor="#94A3B8"
                  />
                  <TouchableOpacity style={styles.annAddBtn} onPress={addAnnotation}>
                    <Text style={styles.annAddText}>Add</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.sideMuted}>Teacher comments only</Text>
              )}
              <TextInput
                style={styles.annInput}
                value={annotationFilter}
                onChangeText={setAnnotationFilter}
                placeholder="Filter comments"
                placeholderTextColor="#94A3B8"
              />
              <ScrollView style={{ flex: 1 }}>
                {filteredAnnotations.map((a) => (
                  <View key={a.id} style={styles.annItem}>
                    <Text style={styles.annText}>{a.text}</Text>
                    <Text style={styles.annMeta}>{new Date(a.createdAt).toLocaleString()}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9F9F9', paddingTop: Platform.OS === 'ios' ? 50 : 22 },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeText: { color: '#475569', fontSize: 14, fontWeight: '600' },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  breadcrumb: { color: '#64748B', fontSize: 11, fontWeight: '600' },
  title: { color: '#1E293B', fontSize: 17, fontWeight: '700', marginTop: 2 },
  toolbar: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.sm,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  toolText: { color: '#334155', fontSize: 11, fontWeight: '600' },
  toolTextActive: { color: '#007ACC' },
  zoomText: { color: '#334155', fontSize: 12, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  contentRow: { flex: 1, flexDirection: 'row', gap: 10, padding: 10 },
  thumbCol: {
    width: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  thumbList: { paddingVertical: 8, gap: 6, alignItems: 'center' },
  thumbItem: {
    width: 42,
    height: 52,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  thumbItemActive: { borderColor: '#007ACC', backgroundColor: '#E0F2FE' },
  thumbText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  thumbTextActive: { color: '#007ACC' },
  viewerCol: { flex: 1 },
  viewerCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...Shadows.sm,
  },
  webview: { flex: 1, backgroundColor: '#FFFFFF' },
  emptyView: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#334155', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  emptyHint: { color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 4, paddingHorizontal: 16 },
  fallbackOpenBtn: {
    marginTop: 12,
    backgroundColor: '#007ACC',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  fallbackOpenText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  footer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageCtrl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#007ACC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  downloadText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  sideCol: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: 10,
    ...Shadows.sm,
  },
  sideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sideTitle: { color: '#1E293B', fontSize: 12, fontWeight: '700' },
  sideMuted: { color: '#64748B', fontSize: 11, marginTop: 6, marginBottom: 8 },
  annHeaderRow: { marginTop: 6, marginBottom: 4 },
  annInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: '#1E293B',
    fontSize: 12,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  annAddBtn: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    backgroundColor: '#007ACC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  annAddText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  annItem: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.sm,
    padding: 8,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
  },
  annText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  annMeta: { color: '#64748B', fontSize: 10, marginTop: 2 },
});

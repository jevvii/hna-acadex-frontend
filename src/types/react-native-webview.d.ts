declare module 'react-native-webview' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export type WebViewSource = { uri: string } | { html: string };

  export interface WebViewProps extends ViewProps {
    source: WebViewSource;
    startInLoadingState?: boolean;
    javaScriptEnabled?: boolean;
    domStorageEnabled?: boolean;
  }

  export class WebView extends React.Component<WebViewProps> {}
}

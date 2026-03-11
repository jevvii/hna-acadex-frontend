/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(app)` | `/(app)/(tabs)` | `/(app)/(tabs)/calendar` | `/(app)/(tabs)/dashboard` | `/(app)/(tabs)/notifications` | `/(app)/(tabs)/todo` | `/(app)/calendar` | `/(app)/dashboard` | `/(app)/notifications` | `/(app)/todo` | `/(tabs)` | `/(tabs)/calendar` | `/(tabs)/dashboard` | `/(tabs)/notifications` | `/(tabs)/todo` | `/_sitemap` | `/calendar` | `/dashboard` | `/login` | `/notifications` | `/todo`;
      DynamicRoutes: `/(app)/course/${Router.SingleRoutePart<T>}` | `/course/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/(app)/course/[id]` | `/course/[id]`;
    }
  }
}

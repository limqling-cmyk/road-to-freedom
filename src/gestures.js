// Swipe gestures used across the app (built on React Native's PanResponder, works in Expo Go).
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Keyboard, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

export const TAB_ORDER = ['Overview', 'Plan', 'Records', 'History', 'Assets'];

const isHorizontal = (g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.8;

// Left / right swipe. Swipe left (finger moves left) = "next", swipe right = "previous".
// capture: take the gesture before children (scroll views, buttons) once it is clearly horizontal.
export function useHorizontalSwipe({ onLeft, onRight, capture = false, threshold = 55 }) {
  const cb = useRef({});
  cb.current = { onLeft, onRight };
  return useMemo(() => {
    const claim = (_, g) => isHorizontal(g);
    return PanResponder.create({
      [capture ? 'onMoveShouldSetPanResponderCapture' : 'onMoveShouldSetPanResponder']: claim,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        const fast = Math.abs(g.vx) > 0.5;
        if (g.dx < -threshold || (fast && g.dx < -25)) cb.current.onLeft?.();
        else if (g.dx > threshold || (fast && g.dx > 25)) cb.current.onRight?.();
      },
    }).panHandlers;
  }, [capture, threshold]);
}

// Direction the next page should come in from: +1 = from the right, -1 = from the left.
// Set just before switching tab (by a swipe or a tab-bar tap) and used by the page that opens.
let pendingDir = 0;
// When a swipe just happened, ignore the "tap" that some platforms fire at the end of it.
let lastSwipeAt = 0;
export const justSwiped = () => Date.now() - lastSwipeAt < 400;
export const setPendingDir = (d) => { pendingDir = d; };

const SLIDE_MS = 230;
const slideIn = (x, from, W, op) => {
  x.setValue(from * W);
  if (op) op.setValue(0.6);
  Animated.parallel([
    Animated.timing(x, { toValue: 0, duration: SLIDE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ...(op ? [Animated.timing(op, { toValue: 1, duration: SLIDE_MS, useNativeDriver: true })] : []),
  ]).start();
};

// Wrap a page. The page follows your finger sideways; let go past the threshold and it slides
// away while the next tab slides in from the other side. Swipe left = next tab, right = previous.
// onLeft / onRight override what a swipe does (null = nothing, the page just springs back).
// slideKey: when it changes (e.g. the month), the content slides in from the matching side.
// enterFrom: 'right' | 'left' slides the page in when it first appears (History detail / list).
export function TabSwipe({ children, style, onLeft, onRight, slideKey, enterFrom }) {
  const nav = useNavigation();
  const route = useRoute();
  const W = useWindowDimensions().width;
  const x = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  const i = TAB_ORDER.indexOf(route.name);
  const goLeft = onLeft !== undefined ? onLeft : i >= 0 && i < TAB_ORDER.length - 1 ? () => { setPendingDir(1); nav.navigate(TAB_ORDER[i + 1]); } : null;
  const goRight = onRight !== undefined ? onRight : i > 0 ? () => { setPendingDir(-1); nav.navigate(TAB_ORDER[i - 1]); } : null;
  const cb = useRef({});
  cb.current = { goLeft, goRight, W };

  // a tab opening: slide in from the side we came from
  useFocusEffect(useCallback(() => {
    const d = pendingDir;
    pendingDir = 0;
    if (d) slideIn(x, d, W, op);
    else { x.setValue(0); op.setValue(1); }
  }, [W]));

  // first appearance of a pushed page (History detail / back to the list)
  useEffect(() => {
    if (enterFrom) slideIn(x, enterFrom === 'right' ? 1 : -1, W, op);
  }, []);

  // month / year changed: content slides in from that side
  const prevKey = useRef(slideKey);
  useEffect(() => {
    if (prevKey.current !== undefined && slideKey !== prevKey.current) {
      const d = String(slideKey) > String(prevKey.current) ? 1 : -1;
      x.setValue(d * W * 0.45);
      op.setValue(0.2);
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: SLIDE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: SLIDE_MS, useNativeDriver: true }),
      ]).start();
    }
    prevKey.current = slideKey;
  }, [slideKey]);

  const handlers = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => isHorizontal(g),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { lastSwipeAt = Date.now(); },
    onPanResponderMove: (_, g) => {
      lastSwipeAt = Date.now();
      const can = g.dx < 0 ? cb.current.goLeft : cb.current.goRight;
      x.setValue(can ? g.dx : g.dx * 0.15); // nowhere to go: just a little rubber-band
    },
    onPanResponderRelease: (_, g) => {
      lastSwipeAt = Date.now();
      const { goLeft, goRight, W: w } = cb.current;
      const fast = Math.abs(g.vx) > 0.5;
      const left = goLeft && (g.dx < -w * 0.22 || (fast && g.dx < -30));
      const right = goRight && (g.dx > w * 0.22 || (fast && g.dx > 30));
      if (left || right) {
        Animated.timing(x, { toValue: left ? -w : w, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: true })
          .start(() => (left ? goLeft : goRight)());
      } else {
        Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 5 }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
  }).panHandlers, []);

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]} {...handlers}>
      <Animated.View style={{ flex: 1, opacity: op, transform: [{ translateX: x }] }}>{children}</Animated.View>
    </View>
  );
}

// A label (month / year in the green bar) that slides in from the side it changed towards.
// order: a sortable key (e.g. '2026-11' or 2026) that tells which way it moved.
export function SlideText({ text, order, style }) {
  const x = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  const prev = useRef(order);
  useEffect(() => {
    if (prev.current !== order) {
      const d = String(order) > String(prev.current) ? 1 : -1;
      x.setValue(d * 70);
      op.setValue(0);
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      prev.current = order;
    }
  }, [order]);
  return <Animated.Text style={[style, { opacity: op, transform: [{ translateX: x }] }]}>{text}</Animated.Text>;
}

// Pull-down-to-close for sheets and pop-up pages.
// The sheet animates itself (open: slides up, close: slides down) so there is only ever ONE
// movement; use it with <Modal animationType="none">. Returns:
//   handlers  -> put on the area that should respond to a pull-down (always works there)
//   bodyHandlers + onScroll -> optional, for the scrolling part: pull-down works there when the
//                content is scrolled to the top, and scrolling is paused while you drag
//   style     -> the Animated.View that moves; backdropStyle -> the dim background
//   dismiss() -> slide down, then call onClose (use it for Cancel / backdrop / after Save)
//   scrollEnabled -> pass to the ScrollView
export function useSwipeDown(onClose, visible) {
  const H = useWindowDimensions().height;
  const y = useRef(new Animated.Value(H)).current;
  const close = useRef(onClose);
  close.current = onClose;
  const closing = useRef(false);
  const atTop = useRef(true);
  const [dragging, setDragging] = React.useState(false);

  // open: slide up once
  useEffect(() => {
    if (visible) {
      closing.current = false;
      atTop.current = true;
      y.setValue(H);
      Animated.timing(y, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible]);

  const dismiss = useCallback((velocity = 0) => {
    if (closing.current) return;
    closing.current = true;
    Keyboard.dismiss();
    const ms = Math.max(120, Math.min(240, 240 - velocity * 60));
    Animated.timing(y, { toValue: H, duration: ms, easing: Easing.in(Easing.quad), useNativeDriver: true })
      .start(() => close.current?.()); // the sheet stays down: nothing jumps back up
  }, [H]);

  const make = (fromBody) => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => (!fromBody || atTop.current) && g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
    onMoveShouldSetPanResponderCapture: (_, g) => (!fromBody || atTop.current) && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.3,
    onPanResponderTerminationRequest: () => false, // don't let scrolling take the finger away
    onPanResponderGrant: () => { Keyboard.dismiss(); if (fromBody) setDragging(true); },
    onPanResponderMove: (_, g) => { if (!closing.current) y.setValue(Math.max(0, g.dy)); },
    onPanResponderRelease: (_, g) => {
      setDragging(false);
      if (g.dy > 80 || (g.vy > 0.8 && g.dy > 20)) dismiss(g.vy);
      else Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 3, speed: 18 }).start();
    },
    onPanResponderTerminate: (_, g) => {
      setDragging(false);
      // if the system interrupts a clear pull-down, still finish closing instead of snapping back
      if (g.dy > 80) dismiss(g.vy);
      else Animated.spring(y, { toValue: 0, useNativeDriver: true }).start();
    },
  }).panHandlers;

  const handlers = useMemo(() => make(false), [dismiss]);
  const bodyHandlers = useMemo(() => make(true), [dismiss]);
  const onScroll = useMemo(() => (e) => { atTop.current = e.nativeEvent.contentOffset.y <= 2; }, []);
  const backdropStyle = { opacity: y.interpolate({ inputRange: [0, H], outputRange: [1, 0], extrapolate: 'clamp' }) };

  return { handlers, bodyHandlers, onScroll, dismiss, scrollEnabled: !dragging, style: { transform: [{ translateY: y }] }, backdropStyle };
}

// Dim background behind a sheet: fades with the sheet, tap it to close.
export function SheetBackdrop({ sheet }) {
  const { Pressable } = require('react-native');
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.38)' }, sheet.backdropStyle]}>
      <Pressable style={{ flex: 1 }} onPress={() => sheet.dismiss()} />
    </Animated.View>
  );
}

export function GrabBar({ light }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
      <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: light ? 'rgba(255,255,255,0.45)' : '#CFCBC0' }} />
    </View>
  );
}

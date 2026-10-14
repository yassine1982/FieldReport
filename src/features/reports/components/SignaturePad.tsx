import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Palette, Radii } from '@/constants/theme';

type Point = { x: number; y: number };

export type SignaturePadHandle = {
  clear: () => void;
  undo: () => void;
  isEmpty: () => boolean;
  getPaths: () => string[];
};

type SignaturePadProps = {
  height?: number;
  strokeColor?: string;
  onDrawingChange?: (isEmpty: boolean) => void;
};

function pointsToPath(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }
  const [first, ...rest] = points;
  let d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  for (const point of rest) {
    d += ` L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }
  return d;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ height = 220, strokeColor, onDrawingChange }, ref) {
    const [paths, setPaths] = useState<string[]>([]);
    const [activePoints, setActivePoints] = useState<Point[]>([]);
    const pathsRef = useRef<string[]>([]);
    const activePointsRef = useRef<Point[]>([]);
    const onDrawingChangeRef = useRef(onDrawingChange);
    onDrawingChangeRef.current = onDrawingChange;

    const notifyEmpty = useCallback((empty: boolean) => {
      onDrawingChangeRef.current?.(empty);
    }, []);

    const beginStroke = useCallback(
      (x: number, y: number) => {
        const point = { x, y };
        activePointsRef.current = [point];
        setActivePoints([point]);
        notifyEmpty(false);
      },
      [notifyEmpty],
    );

    const appendStroke = useCallback((x: number, y: number) => {
      const point = { x, y };
      const next = [...activePointsRef.current, point];
      activePointsRef.current = next;
      setActivePoints(next);
    }, []);

    const endStroke = useCallback(() => {
      const points = activePointsRef.current;
      if (points.length < 2) {
        activePointsRef.current = [];
        setActivePoints([]);
        notifyEmpty(pathsRef.current.length === 0);
        return;
      }
      const path = pointsToPath(points);
      const next = [...pathsRef.current, path];
      pathsRef.current = next;
      activePointsRef.current = [];
      setPaths(next);
      setActivePoints([]);
      notifyEmpty(next.length === 0);
    }, [notifyEmpty]);

    const panGesture = useMemo(
      () =>
        Gesture.Pan()
          .minDistance(0)
          .averageTouches(true)
          .shouldCancelWhenOutside(false)
          .onBegin((event) => {
            'worklet';
            runOnJS(beginStroke)(event.x, event.y);
          })
          .onChange((event) => {
            'worklet';
            runOnJS(appendStroke)(event.x, event.y);
          })
          .onFinalize(() => {
            'worklet';
            runOnJS(endStroke)();
          }),
      [appendStroke, beginStroke, endStroke],
    );

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          pathsRef.current = [];
          activePointsRef.current = [];
          setPaths([]);
          setActivePoints([]);
          notifyEmpty(true);
        },
        undo: () => {
          const next = pathsRef.current.slice(0, -1);
          pathsRef.current = next;
          activePointsRef.current = [];
          setPaths(next);
          setActivePoints([]);
          notifyEmpty(next.length === 0);
        },
        isEmpty: () => pathsRef.current.length === 0 && activePointsRef.current.length === 0,
        getPaths: () => [...pathsRef.current],
      }),
      [notifyEmpty],
    );

    const onLayout = (_event: LayoutChangeEvent) => {
      // Reserved for future coordinate clamping if needed.
    };

    // Always ink on white so captures stay readable in PDFs and dark mode.
    const pen = strokeColor ?? Palette.text;
    const activePath = pointsToPath(activePoints);

    return (
      <GestureDetector gesture={panGesture}>
        <View
          onLayout={onLayout}
          collapsable={false}
          style={[
            styles.canvas,
            {
              height,
              backgroundColor: Palette.white,
            },
          ]}>
          <Svg width="100%" height="100%" pointerEvents="none">
            {paths.map((d, index) => (
              <Path
                key={`stroke-${index}`}
                d={d}
                stroke={pen}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {activePath ? (
              <Path
                d={activePath}
                stroke={pen}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
        </View>
      </GestureDetector>
    );
  },
);

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
});

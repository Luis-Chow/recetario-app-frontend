import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextStyle, StyleProp, NativeSyntheticEvent, TextLayoutEventData,
} from 'react-native';

interface Props {
  text: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  align?: 'left' | 'center';
}

export default function ExpandableText({
  text,
  numberOfLines = 3,
  style,
  linkStyle,
  align = 'left',
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [totalLines, setTotalLines] = useState(0);
  const [measured, setMeasured] = useState(false);

  const onTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (!measured) {
        setTotalLines(e.nativeEvent.lines.length);
        setMeasured(true);
      }
    },
    [measured]
  );

  const exceeds = totalLines > numberOfLines;

  return (
    <View style={align === 'center' ? styles.center : undefined}>
      <Text
        style={style}
        numberOfLines={measured && !expanded ? numberOfLines : undefined}
        ellipsizeMode="tail"
        onTextLayout={onTextLayout}
      >
        {text}
      </Text>
      {exceeds && (
        <TouchableOpacity onPress={() => setExpanded(p => !p)} style={styles.btn}>
          <Text style={[styles.link, linkStyle]}>
            {expanded ? 'Ver menos' : 'Ver más'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  btn: { marginTop: 4 },
  link: { color: '#E8735A', fontSize: 13, fontWeight: '700' },
});

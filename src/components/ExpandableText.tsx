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

/**
 * Muestra un texto recortado a `numberOfLines` con un enlace "Ver más / Ver menos".
 * Es el equivalente móvil del tooltip de escritorio: en lugar de hover, el usuario
 * toca para expandir el texto completo in-line.
 */
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

  // En el primer render medimos cuántas líneas ocupa el texto completo
  // (sin recorte). Después aplicamos el truncado y, si excede el límite,
  // mostramos el botón para expandir.
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

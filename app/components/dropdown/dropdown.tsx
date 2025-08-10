import React, { FC, ReactElement, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  View,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useThemeColor } from '../../theme/useThemeColor';

interface Props {
  label: string;
  data: Array<{ label: string; value: string }>;
  onSelect: (item: { label: string; value: string }) => void;
}

export const Dropdown: FC<Props> = ({ label, data, onSelect }) => {
  const colors = useThemeColor();
  const DropdownButton = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(undefined);
  const [dropdownTop, setDropdownTop] = useState(0);

  const toggleDropdown = (): void => {
    visible ? setVisible(false) : openDropdown();
  };

  const openDropdown = (): void => {
    DropdownButton.current.measure((_fx, _fy, _w, h, _px, py) => {
      setDropdownTop(py + h);
    });
    setVisible(true);
  };

  const onItemPress = (item): void => {
    setSelected(item);
    onSelect(item.value);
    setVisible(false);
  };

  const renderItem = ({ item }): ReactElement<any, any> => (
    <TouchableOpacity style={styles(colors).item} onPress={() => onItemPress(item)}>
      <Text style={{ color: colors.text }}>{item.label}</Text>
    </TouchableOpacity>
  );

  const renderDropdown = (): ReactElement<any, any> => {
    return (
      <Modal visible={visible} transparent animationType="none">
        <TouchableOpacity
          style={styles(colors).overlay}
          onPress={() => setVisible(false)}
        >
          <View style={[styles(colors).dropdown, { top: dropdownTop }]}>
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={(item, index) => index.toString()}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <TouchableOpacity
      ref={DropdownButton}
      style={styles(colors).button}
      onPress={toggleDropdown}
    >
      {renderDropdown()}
      <Text style={[styles(colors).buttonText, { color: colors.text }]}>
        {(selected && selected.label) || label}
      </Text>
      <Icon style={styles(colors).icon} type="font-awesome" name="chevron-down" color={colors.iconDefault} />
    </TouchableOpacity>
  );
};

const styles = (colors: any) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    height: 50,
    zIndex: 1,
    marginHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 15,
    borderRadius: 4,
  },
  buttonText: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
  },
  icon: {
    marginRight: 10,
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: colors.surface,
    width: '100%',
    shadowColor: colors.shadow,
    shadowRadius: 4,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  overlay: {
    width: '100%',
    height: '100%',
  },
  item: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
});
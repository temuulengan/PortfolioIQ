import React, { useEffect, useRef, useState } from 'react';
import { Portal, Dialog, Paragraph, Button, TextInput, HelperText } from 'react-native-paper';

const DeletePortfolioDialog = React.memo(function DeletePortfolioDialog({
  visible,
  onDismiss,
  target,
  onConfirm,
  error: externalError,
}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setInput('');
    setError(null);
  }, [visible, target?.id]);

  useEffect(() => {
    if (!visible) return;
    // give a tick for the dialog to mount before focusing
    const t = setTimeout(() => {
      if (inputRef.current && inputRef.current.focus) {
        try { inputRef.current.focus(); } catch (e) {}
      }
    }, 60);
    return () => clearTimeout(t);
  }, [visible]);

  const handleConfirm = () => {
    if (!target) return;
    if (input.trim() !== target.name) {
      setError('Portfolio name does not match');
      return;
    }
    onConfirm?.(input);
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Delete portfolio "{target?.name}"?</Dialog.Title>
        <Dialog.Content>
          <Paragraph>
            This will permanently delete this portfolio and its holdings. This action cannot be undone.
          </Paragraph>
          <Paragraph style={{ marginTop: 12 }}>
            To confirm, type the portfolio name below:
          </Paragraph>

          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={(t) => { setInput(t); setError(null); }}
            label="Portfolio name"
            style={{ marginTop: 12 }}
            autoFocus
            blurOnSubmit={false}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
          {(error || externalError) && <HelperText type="error">{error || externalError}</HelperText>}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            mode="contained"
            buttonColor="#E53935"
            onPress={handleConfirm}
            disabled={input.trim() !== (target?.name || '')}
          >
            Delete Portfolio
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
});

export default DeletePortfolioDialog;
import React from 'react';
import { Portal, Dialog, Paragraph, TextInput, Button, HelperText } from 'react-native-paper';

const DeletePortfolioDialog = ({ visible, onDismiss, target, value, onChangeValue, onConfirm, error }) => {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Delete portfolio "{target?.name}"?</Dialog.Title>
        <Dialog.Content>
          <Paragraph>
            This will permanently delete this portfolio and its holdings. This action cannot be undone.
          </Paragraph>

          <Paragraph style={{ marginTop: 12 }}>
            To confirm, type the portfolio name below:
          </Paragraph>

          <TextInput
            value={value}
            onChangeText={(t) => { onChangeValue && onChangeValue(t); }}
            label="Portfolio name"
            style={{ marginTop: 12 }}
            autoFocus
            blurOnSubmit={false}
            returnKeyType="done"
            onSubmitEditing={() => {}}
          />
          {error ? <HelperText type="error">{error}</HelperText> : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            mode="contained"
            buttonColor="#E53935"
            onPress={onConfirm}
            disabled={value.trim() !== (target?.name || '')}
          >
            Delete Portfolio
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default React.memo(DeletePortfolioDialog);

import {useState} from "react";

export function useDialog() : [{ hide: () => void } | undefined, () => void] {
  const [visible, setVisible] = useState<boolean>(false);
  const show = () => {
    setVisible(true);
  }
  const hide = () => {
    setVisible(false);
  }
  return [visible ? { hide: hide } : undefined, show];
}

export function useDialogWithArg<T>() : [{ arg: T, hide: () => void } | undefined, (arg: T) => void] {
  const [visible, setVisible] = useState<T | undefined>();
  const show = (arg : T) => {
    setVisible(arg);
  }
  const hide = () => {
    setVisible(undefined);
  }
  return [visible ? { arg: visible, hide: hide } : undefined, show];
}

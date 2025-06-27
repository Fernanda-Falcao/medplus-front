

import { toast } from "react-toastify";

export const notify = (mensagem) => toast(mensagem, { position: "top-right" });

export const notifyInfo = (mensagem) => toast.info(mensagem, { position: "top-right" });

export const notifyWarn = (mensagem) => toast.warn(mensagem, { position: "top-right" });

export const notifySuccess = (mensagem) => toast.success(mensagem, { position: "top-right" });

export const notifyError = (mensagem) => toast.error(mensagem, { position: "top-right" });


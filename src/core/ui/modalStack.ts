
import { LogEngineV4 } from "../../api/admin/logEngineV4";

type ModalListener = (stack: string[]) => void;

class ModalStackManager {
    private stack: string[] = [];
    private listeners: ModalListener[] = [];

    public open(id: string) {
        if (!this.stack.includes(id)) {
            this.stack.push(id);
            this.notify();
            document.body.classList.add('modal-open');
        }
    }

    public close(id: string) {
        this.stack = this.stack.filter(modalId => modalId !== id);
        this.notify();
        if (this.stack.length === 0) {
            document.body.classList.remove('modal-open');
        }
    }

    public closeAll() {
        this.stack = [];
        this.notify();
        document.body.classList.remove('modal-open');
    }

    public getTop(): string | undefined {
        return this.stack[this.stack.length - 1];
    }

    public isOpen(id: string): boolean {
        return this.stack.includes(id);
    }

    public subscribe(listener: ModalListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.stack));
        // Optional: Log stack changes for debugging if stack gets complex
        // LogEngineV4.log({ action: 'modal_stack_change', category: 'system', payload: { stack: this.stack } });
    }
}

export const modalStack = new ModalStackManager();

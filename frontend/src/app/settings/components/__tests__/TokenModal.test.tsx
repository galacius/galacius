import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { createElement } from "react";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const FormModalMock = vi.hoisted(() => {
  return vi.fn(({ open, onSubmit, submitDisabled, children, title, ...props }: any) =>
    open
      ? createElement("div", { "data-testid": "form-modal", ...props }, [
          createElement("div", { key: "title", "data-testid": "modal-title" }, title),
          createElement("div", { key: "children" }, children),
          createElement("button", {
            key: "submit",
            onClick: onSubmit,
            disabled: submitDisabled,
            "data-testid": "modal-submit-button",
          }),
        ])
      : null
  );
});

vi.mock("@galacius/design-system", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    FormModal: FormModalMock,
  };
});

// ─── imports after mocks ──────────────────────────────────────────────────────

import { TokenModal } from "../TokenModal";

// ─── setup ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("TokenModal", () => {
  describe("title and mode", () => {
    it("shows 'Add Access Token' title when no saved token", () => {
      render(<TokenModal open={true} onClose={vi.fn()} onSubmit={vi.fn()} savedToken="" />);
      expect(screen.getByTestId("modal-title")).toHaveTextContent("Add Access Token");
    });

    it("shows 'Update Access Token' title when saved token exists", () => {
      render(
        <TokenModal
          open={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          savedToken="ghp_existing_token"
        />
      );
      expect(screen.getByTestId("modal-title")).toHaveTextContent("Update Access Token");
    });

    it("switches title from Add to Update when savedToken prop changes", () => {
      const { rerender } = render(
        <TokenModal open={true} onClose={vi.fn()} onSubmit={vi.fn()} savedToken="" />
      );
      expect(screen.getByTestId("modal-title")).toHaveTextContent("Add Access Token");

      rerender(
        <TokenModal open={true} onClose={vi.fn()} onSubmit={vi.fn()} savedToken="ghp_new_token" />
      );
      expect(screen.getByTestId("modal-title")).toHaveTextContent("Update Access Token");
    });
  });

  describe("submit button disabled state", () => {
    it("disables submit button when token input is empty", () => {
      render(<TokenModal open={true} onClose={vi.fn()} onSubmit={vi.fn()} savedToken="" />);
      const submitButton = screen.getByTestId("modal-submit-button");
      expect(submitButton).toBeDisabled();
    });

    it("disables submit button when token input is only whitespace", async () => {
      render(<TokenModal open={true} onClose={vi.fn()} onSubmit={vi.fn()} savedToken="" />);
      const tokenInput = screen.getByPlaceholderText("Paste access token");
      fireEvent.change(tokenInput, { target: { value: "   " } });
      await waitFor(() => {
        const submitButton = screen.getByTestId("modal-submit-button");
        expect(submitButton).toBeDisabled();
      });
    });

    it("enables submit button when token input has content", async () => {
      render(<TokenModal open={true} onClose={vi.fn()} onSubmit={vi.fn()} savedToken="" />);
      const tokenInput = screen.getByPlaceholderText("Paste access token");
      fireEvent.change(tokenInput, { target: { value: "ghp_new_token_123" } });
      await waitFor(() => {
        const submitButton = screen.getByTestId("modal-submit-button");
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe("submit behavior", () => {
    it("calls onSubmit with token value on submit button click", async () => {
      const mockSubmit = vi.fn();
      render(<TokenModal open={true} onClose={vi.fn()} onSubmit={mockSubmit} savedToken="" />);
      const tokenInput = screen.getByPlaceholderText("Paste access token");
      fireEvent.change(tokenInput, { target: { value: "ghp_test_token" } });
      const submitButton = screen.getByTestId("modal-submit-button");
      await waitFor(() => expect(submitButton).not.toBeDisabled());
      fireEvent.click(submitButton);
      expect(mockSubmit).toHaveBeenCalledWith("ghp_test_token");
    });

    it("calls onSubmit with trimmed token value", async () => {
      const mockSubmit = vi.fn();
      render(<TokenModal open={true} onClose={vi.fn()} onSubmit={mockSubmit} savedToken="" />);
      const tokenInput = screen.getByPlaceholderText("Paste access token");
      fireEvent.change(tokenInput, { target: { value: "ghp_token_with_trailing_space " } });
      const submitButton = screen.getByTestId("modal-submit-button");
      await waitFor(() => expect(submitButton).not.toBeDisabled());
      fireEvent.click(submitButton);
      expect(mockSubmit).toHaveBeenCalledWith("ghp_token_with_trailing_space");
    });

    it("calls onSubmit with unchanged saved token when submitted without replacing", async () => {
      const mockSubmit = vi.fn();
      render(
        <TokenModal
          open={true}
          onClose={vi.fn()}
          onSubmit={mockSubmit}
          savedToken="ghp_existing_token"
        />
      );
      const submitButton = screen.getByTestId("modal-submit-button");
      expect(submitButton).not.toBeDisabled();
      fireEvent.click(submitButton);
      expect(mockSubmit).toHaveBeenCalledWith("ghp_existing_token");
    });
  });

  describe("masked saved token / replace flow", () => {
    it("shows the saved token masked and disabled by default", () => {
      render(
        <TokenModal
          open={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          savedToken="ghp_existing_token"
        />
      );
      const tokenInput = screen.getByLabelText("Access token input") as HTMLInputElement;
      expect(tokenInput).toBeDisabled();
      expect(tokenInput).toHaveAttribute("type", "password");
      expect(tokenInput.value).toBe("ghp_existing_token");
      expect(screen.getByText("Replace")).toBeInTheDocument();
    });

    it("switches to an editable input pre-filled with the saved token after clicking Replace", () => {
      render(
        <TokenModal
          open={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          savedToken="ghp_existing_token"
        />
      );
      fireEvent.click(screen.getByText("Replace"));
      const tokenInput = screen.getByLabelText("Access token input") as HTMLInputElement;
      expect(tokenInput).not.toBeDisabled();
      expect(tokenInput).toHaveAttribute("type", "text");
      expect(tokenInput.value).toBe("ghp_existing_token");
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("allows removing the token entirely after clicking Replace", async () => {
      const mockSubmit = vi.fn();
      render(
        <TokenModal
          open={true}
          onClose={vi.fn()}
          onSubmit={mockSubmit}
          savedToken="ghp_existing_token"
        />
      );
      fireEvent.click(screen.getByText("Replace"));
      const tokenInput = screen.getByLabelText("Access token input") as HTMLInputElement;
      expect(tokenInput.value).toBe("ghp_existing_token");
      fireEvent.change(tokenInput, { target: { value: "" } });
      const submitButton = screen.getByTestId("modal-submit-button");
      expect(submitButton).not.toBeDisabled();
      fireEvent.click(submitButton);
      expect(mockSubmit).toHaveBeenCalledWith("");
    });

    it("reverts to masked saved token after clicking Cancel", () => {
      render(
        <TokenModal
          open={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          savedToken="ghp_existing_token"
        />
      );
      fireEvent.click(screen.getByText("Replace"));
      const tokenInput = screen.getByLabelText("Access token input") as HTMLInputElement;
      fireEvent.change(tokenInput, { target: { value: "ghp_new_value" } });
      fireEvent.click(screen.getByText("Cancel"));
      expect(tokenInput).toBeDisabled();
      expect(tokenInput.value).toBe("ghp_existing_token");
    });

    it("submits the newly typed value after replacing", async () => {
      const mockSubmit = vi.fn();
      render(
        <TokenModal
          open={true}
          onClose={vi.fn()}
          onSubmit={mockSubmit}
          savedToken="ghp_existing_token"
        />
      );
      fireEvent.click(screen.getByText("Replace"));
      const tokenInput = screen.getByLabelText("Access token input");
      fireEvent.change(tokenInput, { target: { value: "ghp_new_value" } });
      const submitButton = screen.getByTestId("modal-submit-button");
      await waitFor(() => expect(submitButton).not.toBeDisabled());
      fireEvent.click(submitButton);
      expect(mockSubmit).toHaveBeenCalledWith("ghp_new_value");
    });

    it("does not show a Replace button when there is no saved token", () => {
      render(<TokenModal open={true} onClose={vi.fn()} onSubmit={vi.fn()} savedToken="" />);
      expect(screen.queryByText("Replace")).not.toBeInTheDocument();
    });
  });

  describe("modal closing", () => {
    it("calls onClose when modal is closed via onOpenChange(false)", () => {
      const mockClose = vi.fn();
      render(<TokenModal open={true} onClose={mockClose} onSubmit={vi.fn()} savedToken="" />);
      // FormModal calls handleOpenChange with false, which calls onClose
      const onOpenChangeCall = FormModalMock.mock.calls[FormModalMock.mock.calls.length - 1][0];
      onOpenChangeCall.onOpenChange(false);
      expect(mockClose).toHaveBeenCalled();
    });

    it("clears token input when modal closes", async () => {
      render(<TokenModal open={true} onClose={vi.fn()} onSubmit={vi.fn()} savedToken="" />);
      const tokenInput = screen.getByPlaceholderText("Paste access token") as HTMLInputElement;
      fireEvent.change(tokenInput, { target: { value: "ghp_token" } });
      expect(tokenInput.value).toBe("ghp_token");

      // Simulate closing modal
      const onOpenChangeCall = FormModalMock.mock.calls[FormModalMock.mock.calls.length - 1][0];
      onOpenChangeCall.onOpenChange(false);

      // Re-render to verify input is cleared
      render(<TokenModal open={true} onClose={vi.fn()} onSubmit={vi.fn()} savedToken="" />);
      const newTokenInput = screen.getAllByPlaceholderText("Paste access token")[
        screen.getAllByPlaceholderText("Paste access token").length - 1
      ] as HTMLInputElement;
      expect(newTokenInput.value).toBe("");
    });
  });

  describe("loading state", () => {
    it("disables input when isLoading is true", () => {
      render(
        <TokenModal
          open={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          savedToken=""
          isLoading={true}
        />
      );
      const tokenInput = screen.getByPlaceholderText("Paste access token") as HTMLInputElement;
      expect(tokenInput).toBeDisabled();
    });

    it("passes isLoading to FormModal", () => {
      render(
        <TokenModal
          open={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          savedToken=""
          isLoading={true}
        />
      );
      const formModalCall = FormModalMock.mock.calls[FormModalMock.mock.calls.length - 1][0];
      expect(formModalCall.isLoading).toBe(true);
    });

    it("enables input when isLoading is false", () => {
      render(
        <TokenModal
          open={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          savedToken=""
          isLoading={false}
        />
      );
      const tokenInput = screen.getByPlaceholderText("Paste access token") as HTMLInputElement;
      expect(tokenInput).not.toBeDisabled();
    });
  });

  describe("modal visibility", () => {
    it("renders nothing when open is false", () => {
      render(<TokenModal open={false} onClose={vi.fn()} onSubmit={vi.fn()} savedToken="" />);
      expect(screen.queryByTestId("form-modal")).not.toBeInTheDocument();
    });

    it("renders modal when open is true", () => {
      render(<TokenModal open={true} onClose={vi.fn()} onSubmit={vi.fn()} savedToken="" />);
      expect(screen.getByTestId("form-modal")).toBeInTheDocument();
    });
  });
});

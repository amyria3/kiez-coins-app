-- Freigaben und Operationsnamen dürfen nicht auf eine andere Challenge umgehängt werden.
revoke update on public.payout_shares, public.operation_names from authenticated;
grant update (method, account_holder, iban, paypal) on public.payout_shares to authenticated;
grant update (name) on public.operation_names to authenticated;

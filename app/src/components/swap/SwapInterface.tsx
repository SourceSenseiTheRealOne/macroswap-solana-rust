import React, { useState, useEffect } from "react";
import { Form, FormControl, InputGroup } from "react-bootstrap";
import SolDropdown from "./SolDropdown";
import styles from "./SwapInterface.module.css";
import TokenDropdown from "./TokenDropdown";
import SwapButton from "../SwapButton";
import RateBox from "./RateBox";
import { useWallet, useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import useAsyncEffect from "use-async-effect";
import { u64 } from "@solana/spl-token";
import { toBN } from "../../utils";
import { getSolBalance } from "../../interactions/sol";
import { getMacroBalance } from "../../interactions/macro";
import { getProvider } from "../../connectors";
import { buyTokenTx, sellTokenTx } from "../../interactions/macroswap";
import { Transaction } from "@solana/web3.js";

type TSwapDirection = "BuyToken" | "SellToken"

const SwapInterface = (): JSX.Element => {
  const [swapDirection, setSwapDirection] = useState<TSwapDirection>("BuyToken");
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isPayable, setPayable] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string | undefined>(undefined);
  const [input, setInput] = useState<number>(0);
  const [output, setOutput] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [macroBalance, setMacroBalance] = useState<u64>(new u64(0));

  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const walletModal = useWalletModal();
  const { connection } = useConnection();

  const onInputChange = (
    e: React.ChangeEvent<typeof FormControl & HTMLInputElement>
  ) => {
    const inputValueNumber = Number(e.target.value);
    if (inputValueNumber >= 0 && e.target.value) {
      setInput(inputValueNumber);
      setInputValue(e.target.value.toString());
    } else {
      setInput(0);
      setInputValue(undefined);
    }
  }

  const onClickSwapDirection = () => {
    switch(swapDirection){
      case "BuyToken":
        setSwapDirection("SellToken");
        break;
      case "SellToken":
        setSwapDirection("BuyToken");
        break;
    }
  }

  const onClickSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if(wallet.connected && wallet.publicKey !== null && anchorWallet){
      const provider = getProvider(anchorWallet, connection);
      let tx: Transaction;

      switch(swapDirection){
        case "BuyToken":
          tx = await buyTokenTx(provider, input, output);
          break;
        case "SellToken":
          tx = await sellTokenTx(provider, input);
          break;
      }

      const txHash = await wallet.sendTransaction(tx, connection);
      console.log(txHash);
    }else{
      walletModal.setVisible(true);
    }
  }

  const onClickReload = async () => {
    if(wallet.connected && wallet.publicKey !== null && anchorWallet){
      const provider = getProvider(anchorWallet, connection);
      setSolBalance(await getSolBalance(provider, wallet.publicKey));
      setMacroBalance(await getMacroBalance(provider, wallet.publicKey));
    }
  }

  useEffect(() => {
    switch(swapDirection){
      case "BuyToken":
        setOutput(input * 100);
        setPayable(solBalance >= input * 10**9);
        break;
      case "SellToken":
        setOutput(input / 100);
        setPayable(macroBalance.gte(toBN(input, 9)));
        break;
    }
  }, [input, swapDirection, solBalance, macroBalance]);

  useAsyncEffect(async () => {
    await onClickReload();
  }, [wallet.connected])

  return (
    <main className={styles.main}>
      <Form className={styles.box} onSubmit={onClickSubmit}>
        <InputGroup className={styles.inputGroup} id={styles.top}>
          <Form.Control
            className={styles.formControl}
            id={styles.topFormControl}
            inputMode="decimal"
            type="number"
            min="0"
            placeholder="0.00"
            step="any"
            autoComplete="off"
            autoCorrect="off"
            onChange={onInputChange}
            onWheel={(e: any) => e.target.blur()}
            value={inputValue || ""}
            required={wallet.connected ? true : false}
          />
          {swapDirection === "BuyToken" ? <SolDropdown /> : <TokenDropdown />}
        </InputGroup>
        <div className={styles.arrowBox}>
          <h2 onClick={onClickSwapDirection}>↓</h2>
        </div>
        <InputGroup className={styles.inputGroup} id={styles.bottom}>
          <Form.Control
            className={styles.formControl}
            id={styles.bottomFormControl}
            type="number"
            placeholder="0.00"
            value={output === 0 ? "" : output.toFixed(7)}
            disabled
          />
          {swapDirection === "BuyToken" ? <TokenDropdown /> : <SolDropdown />}
        </InputGroup>
        <RateBox onClickReload={onClickReload} />
        <SwapButton 
          loading={isLoading || wallet.connecting}
          payable={isPayable}
          hasEntered={input ? true : false}
        />
      </Form>
    </main>
  );
};

export default SwapInterface;

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IFacilitator
 * @dev Interface for the facilitator contract
 */
interface IFacilitator {
    /**
     * @dev Emitted when a transaction is facilitated
     * @param sender The address that initiated the facilitation
     * @param target The target address of the transaction
     * @param token The token address (address(0) for native transfers)
     * @param value The amount being transferred
     * @param txHash The transaction hash
     * @param timestamp The block timestamp
     * @param txType The transaction type (0 = native, 1 = ERC20, 2 = cross-chain)
     */
    event FacilitatedTx(
        address indexed sender,
        address indexed target,
        address indexed token,
        uint256 value,
        bytes32 txHash,
        uint256 timestamp,
        uint8 txType
    );

    /**
     * @dev Facilitate a native token (ETH) transfer
     * @param recipient The recipient address
     * @param amount The amount to transfer
     */
    function facilitateNativeTransfer(address recipient, uint256 amount) external payable;

    /**
     * @dev Facilitate an ERC20 token transfer
     * @param token The token contract address
     * @param recipient The recipient address
     * @param amount The amount to transfer
     */
    function facilitateTokenTransfer(address token, address recipient, uint256 amount) external;

    /**
     * @dev Facilitate a cross-chain operation
     * @param target The target contract address
     * @param value The value to send
     * @param data The call data
     */
    function facilitateCrossChain(address target, uint256 value, bytes calldata data) external payable;
}

